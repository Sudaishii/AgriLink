import { Request, Response } from 'express';
import { db } from '../database/database';
import { getImageEmbedding, cosineSimilarity } from '../services/imageEmbeddingService';
import { writeLog } from '../services/systemLogService';

// Ensure the embedding column exists (runs once)
let embeddingColumnEnsured = false;
const ensureEmbeddingColumn = async () => {
    if (embeddingColumnEnsured) return;
    await db.execute(
        `ALTER TABLE product_table ADD COLUMN IF NOT EXISTS p_image_embedding LONGTEXT DEFAULT NULL`
    );
    embeddingColumnEnsured = true;
};

/**
 * POST /api/search/image
 * Accepts a multipart image upload, generates a CLIP embedding,
 * then performs cosine similarity matching against all product embeddings.
 * Returns ranked product IDs and similarity scores.
 */
export const searchByImage = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No image uploaded.' });
            return;
        }

        await ensureEmbeddingColumn();

        console.log('[ImageSearch] Generating CLIP embedding for uploaded query image...');
        const queryEmbedding = await getImageEmbedding(req.file.buffer, req.file.mimetype);
        console.log(`[ImageSearch] Query embedding generated. Dimensions: ${queryEmbedding.length}`);

        // Fetch all active products that have a stored embedding
        const [rows]: any = await db.execute(
            `SELECT p.p_id, p.p_name, p.p_image, p.p_image_embedding
             FROM product_table p
             WHERE p.p_status = 'active' AND p.p_image_embedding IS NOT NULL`
        );

        if (!rows || rows.length === 0) {
            res.json({
                success: true,
                message: 'No indexed products yet. Products will be indexed as they are added.',
                matches: [],
                totalIndexed: 0
            });
            return;
        }

        // Compute cosine similarity for each product
        const SIMILARITY_THRESHOLD = 0.60; // Minimum score to be considered a match (forgiving for low-quality images)
        const scored: { p_id: number; p_name: string; similarity: number }[] = [];

        for (const row of rows) {
            try {
                const storedEmbedding: number[] = JSON.parse(row.p_image_embedding);
                const similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
                if (similarity >= SIMILARITY_THRESHOLD) {
                    scored.push({ p_id: row.p_id, p_name: row.p_name, similarity });
                }
            } catch {
                // Skip products with malformed embeddings
            }
        }

        // Sort by similarity score descending (best matches first)
        scored.sort((a, b) => b.similarity - a.similarity);

        const TOP_N = 20;
        const topMatches = scored.slice(0, TOP_N);

        console.log(`[ImageSearch] Found ${topMatches.length} matches above threshold from ${rows.length} indexed products.`);

        writeLog({
            action: 'Performed AI Image Search',
            event_type: 'visual_search',
            module: 'Marketplace',
            category: 'System',
            severity: 'info',
            user_id: (req as any).user?.id || (req as any).user?.u_id,
            method: req.method,
            endpoint: req.originalUrl || req.url,
            ip_address: req.ip,
            after_data: { matchesCount: topMatches.length, totalIndexed: rows.length }
        });

        res.json({
            success: true,
            matches: topMatches.map(m => ({
                productId: m.p_id,
                name: m.p_name,
                similarityScore: parseFloat(m.similarity.toFixed(4))
            })),
            totalIndexed: rows.length,
            queryEmbeddingDimensions: queryEmbedding.length
        });
    } catch (error: any) {
        console.error('[ImageSearch] Error:', error);
        writeLog({
            action: 'AI Image Search Failed',
            event_type: 'visual_search_error',
            module: 'Marketplace',
            category: 'System',
            severity: 'error',
            user_id: (req as any).user?.id || (req as any).user?.u_id,
            method: req.method,
            endpoint: req.originalUrl || req.url,
            ip_address: req.ip,
            error_message: error.message
        });
        res.status(500).json({ success: false, message: error.message || 'Image search failed.' });
    }
};

/**
 * POST /api/search/index-product
 * Internal: Generate and store the CLIP embedding for a specific product.
 * Called automatically after product create/update with an image.
 */
export const indexProductImage = async (productId: number, imageBuffer: Buffer, mimeType: string): Promise<void> => {
    try {
        await ensureEmbeddingColumn();
        console.log(`[ImageIndex] Generating embedding for product #${productId}...`);
        const embedding = await getImageEmbedding(imageBuffer, mimeType);
        const embeddingJson = JSON.stringify(embedding);
        await db.execute(
            'UPDATE product_table SET p_image_embedding = ? WHERE p_id = ?',
            [embeddingJson, productId]
        );
        console.log(`[ImageIndex] ✓ Indexed product #${productId} (${embedding.length}D vector stored)`);
        writeLog({
            action: 'Generated Product Image Embedding',
            event_type: 'index_product_image',
            module: 'Marketplace',
            category: 'System',
            severity: 'success',
            detail: `Successfully generated and saved ${embedding.length}D CLIP vector for Product #${productId}`
        });
    } catch (error: any) {
        // Non-fatal: log and continue. Product is saved, just not indexed for image search yet.
        console.error(`[ImageIndex] Failed to index product #${productId}:`, error.message);
        writeLog({
            action: 'Failed to Generate Image Embedding',
            event_type: 'index_product_image_error',
            module: 'Marketplace',
            category: 'System',
            severity: 'warning',
            detail: `Failed to index product #${productId}: ${error.message}`,
            error_message: error.message
        });
    }
};

// Keep the old analyzeImage route for backward compatibility (redirects to new search)
export const analyzeImage = searchByImage;
