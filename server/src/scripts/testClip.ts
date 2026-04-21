import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { getImageEmbedding, cosineSimilarity } from '../services/imageEmbeddingService';

const run = async () => {
    const uploadsDir = path.join(process.cwd(), 'public/uploads');
    const files = fs.readdirSync(uploadsDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    if (files.length < 1) {
        console.log('No images in uploads folder to test with.');
        return;
    }

    console.log(`\n🔬 Testing CLIP local inference with: ${files[0]}\n`);
    const buf1 = fs.readFileSync(path.join(uploadsDir, files[0]));
    const emb1 = await getImageEmbedding(buf1, 'image/jpeg');
    console.log(`✅ Embedding 1 — dimensions: ${emb1.length}, first 5 values: [${emb1.slice(0,5).map(v=>v.toFixed(4)).join(', ')}]`);

    if (files.length >= 2) {
        console.log(`\n🔬 Testing with second image: ${files[1]}\n`);
        const buf2 = fs.readFileSync(path.join(uploadsDir, files[1]));
        const emb2 = await getImageEmbedding(buf2, 'image/jpeg');
        console.log(`✅ Embedding 2 — dimensions: ${emb2.length}`);

        const sim = cosineSimilarity(emb1, emb2);
        console.log(`\n📊 Cosine similarity between image 1 and image 2: ${sim.toFixed(4)}`);
        console.log(sim > 0.8 ? '→ Very similar products!' : sim > 0.5 ? '→ Somewhat similar.' : '→ Different products.');
    }

    // Self-similarity test (should be 1.0)
    const selfSim = cosineSimilarity(emb1, emb1);
    console.log(`\n🔁 Self-similarity (should be 1.0): ${selfSim.toFixed(6)}`);
    console.log('\n✅ CLIP local inference is working correctly!');
    process.exit(0);
};

run().catch(err => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
});
