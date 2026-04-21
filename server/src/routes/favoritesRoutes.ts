import { Router } from 'express';
import { favoritesController } from '../controllers/favoritesController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// POST /favorites - Add a product to favorites
router.post('/', authenticateToken, favoritesController.addFavorite);

// DELETE /favorites/:productId - Remove a product from favorites
router.delete('/:productId', authenticateToken, favoritesController.removeFavorite);

// GET /favorites - Get all favorite products for the authenticated user
router.get('/', authenticateToken, favoritesController.getFavorites);

// GET /favorites/is/:productId - Check if a specific product is a favorite for the authenticated user
router.get('/is/:productId', authenticateToken, favoritesController.isFavorite);

export default router;
