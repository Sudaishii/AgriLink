import express from 'express';
import multer from 'multer';
import * as searchController from '../controllers/searchController';

// Use memory storage so we get the buffer directly for embedding generation
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// POST /api/search/image — CLIP vector-based image search
router.post('/image', upload.single('image'), searchController.searchByImage);

export default router;
