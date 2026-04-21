"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Bulk Image Indexer Script
 * ─────────────────────────
 * Run with:  npx ts-node src/scripts/bulkIndexImages.ts
 *
 * Reads all active products that have a p_image but no p_image_embedding,
 * downloads the image from the local uploads folder, generates a CLIP
 * embedding via HuggingFace API, and stores it in the DB.
 */
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../database/database");
const imageEmbeddingService_1 = require("../services/imageEmbeddingService");
const UPLOADS_DIR = path_1.default.join(process.cwd(), 'public/uploads');
const run = async () => {
    console.log('🔍 Bulk Image Indexer — CLIP Embeddings\n');
    // Ensure column exists
    await database_1.db.execute(`ALTER TABLE product_table ADD COLUMN IF NOT EXISTS p_image_embedding LONGTEXT DEFAULT NULL`);
    const [rows] = await database_1.db.execute(`SELECT p_id, p_name, p_image
         FROM product_table
         WHERE p_status = 'active'
           AND p_image IS NOT NULL
           AND p_image != ''
           AND p_image_embedding IS NULL
         ORDER BY p_id ASC`);
    if (!rows || rows.length === 0) {
        console.log('✅ All active products are already indexed!');
        process.exit(0);
    }
    console.log(`Found ${rows.length} product(s) to index.\n`);
    let success = 0;
    let failed = 0;
    for (const row of rows) {
        const imagePath = row.p_image;
        // e.g. "/uploads/p_image-1234567890.jpg"
        const filename = path_1.default.basename(imagePath);
        const localPath = path_1.default.join(UPLOADS_DIR, filename);
        if (!fs_1.default.existsSync(localPath)) {
            console.log(`  ⚠️  [#${row.p_id}] ${row.p_name} — file not found: ${localPath}`);
            failed++;
            continue;
        }
        try {
            const buffer = fs_1.default.readFileSync(localPath);
            const ext = path_1.default.extname(filename).toLowerCase();
            const mimeMap = {
                '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                '.png': 'image/png', '.webp': 'image/webp',
                '.gif': 'image/gif'
            };
            const mimeType = mimeMap[ext] || 'image/jpeg';
            const embedding = await (0, imageEmbeddingService_1.getImageEmbedding)(buffer, mimeType);
            await database_1.db.execute('UPDATE product_table SET p_image_embedding = ? WHERE p_id = ?', [JSON.stringify(embedding), row.p_id]);
            console.log(`  ✅ [#${row.p_id}] ${row.p_name} (${embedding.length}D)`);
            success++;
        }
        catch (err) {
            console.error(`  ❌ [#${row.p_id}] ${row.p_name} — ${err.message}`);
            failed++;
        }
        // Small delay to avoid rate-limiting on HuggingFace API
        await new Promise(r => setTimeout(r, 500));
    }
    console.log(`\n─────────────────────────────`);
    console.log(`✅ Indexed: ${success}  ❌ Failed: ${failed}`);
    process.exit(0);
};
run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
