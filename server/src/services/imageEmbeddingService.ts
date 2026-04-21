import { pipeline, RawImage, env } from '@huggingface/transformers';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Run ONNX models locally — no API key needed for CLIP
env.allowLocalModels = false;

// Singleton extractor pipeline — model is downloaded once and cached on disk
let extractor: any = null;
let extractorLoading = false;
let extractorReady = false;

/**
 * Lazily initializes the CLIP feature-extraction pipeline.
 * On first call it downloads the Xenova/clip-vit-base-patch32 ONNX model (~90MB)
 * and caches it. Subsequent calls are instant.
 */
const getExtractor = async () => {
    if (extractorReady && extractor) return extractor;

    if (extractorLoading) {
        // Wait up to 120s for another concurrent call to finish loading
        for (let i = 0; i < 240; i++) {
            await new Promise(r => setTimeout(r, 500));
            if (extractorReady && extractor) return extractor;
        }
        throw new Error('CLIP model loading timed out.');
    }

    extractorLoading = true;
    console.log('[CLIP] Loading CLIP model locally (first run: ~90MB download)...');

    extractor = await pipeline(
        'image-feature-extraction',
        'Xenova/clip-vit-base-patch32',
        { dtype: 'fp32' }
    );

    extractorReady = true;
    extractorLoading = false;
    console.log('[CLIP] ✓ CLIP model ready for local inference.');
    return extractor;
};

/**
 * Generate a CLIP image embedding vector from a raw image buffer.
 * Writes a temp file so that RawImage.fromURL can load it (data URLs are unsupported).
 * Returns a flat number[] of 512 dimensions.
 */
export const getImageEmbedding = async (imageBuffer: Buffer, mimeType: string): Promise<number[]> => {
    const extract = await getExtractor();

    // Determine file extension from mime type
    const extMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
    };
    const ext = extMap[mimeType] || '.jpg';

    // Write buffer to a temp file (RawImage.fromURL requires a file/http path, not data URLs)
    const tmpPath = path.join(os.tmpdir(), `clip_img_${Date.now()}${ext}`);
    fs.writeFileSync(tmpPath, imageBuffer);

    try {
        const image = await RawImage.fromURL(tmpPath);

        // pool over the patch tokens and L2-normalize → standard CLIP image vector
        const output = await extract(image, { pooling: 'mean', normalize: true });
        return Array.from(output.data as Float32Array);
    } finally {
        // Always clean up the temp file
        try { fs.unlinkSync(tmpPath); } catch {}
    }
};

/**
 * Compute cosine similarity between two vectors.
 * Since CLIP vectors are L2-normalized, this simplifies to a dot product,
 * but we compute the full formula for robustness.
 * Returns a value between -1 and 1. Higher = more visually similar.
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
};
