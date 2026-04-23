import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import * as cartController from '../controllers/cartController';

const cartRoutes = Router();

cartRoutes.get('/', authenticateToken, cartController.getMyCart);
cartRoutes.post('/', authenticateToken, cartController.addToCart);
cartRoutes.put('/:productId', authenticateToken, cartController.updateCartItem);
cartRoutes.delete('/:productId', authenticateToken, cartController.removeCartItem);
cartRoutes.delete('/', authenticateToken, cartController.clearMyCart);

export default cartRoutes;
