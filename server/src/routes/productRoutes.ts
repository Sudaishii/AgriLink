import { Router } from 'express';
import * as productController from '../controllers/productController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

export const productRoutes = Router();

productRoutes.get('/farmer/:u_id', productController.getFarmerProducts);
productRoutes.get('/landing/snapshot', productController.getLandingSnapshot);
productRoutes.get('/:id', productController.getProductById);
productRoutes.get('/', productController.getAllProducts);
productRoutes.post('/product', authenticateToken, upload.single('p_image'), productController.createProduct);
productRoutes.put('/archive/:id', authenticateToken, productController.archiveProduct);
productRoutes.put('/unarchive/:id', authenticateToken, productController.unarchiveProduct);
productRoutes.put('/:id', authenticateToken, upload.single('p_image'), productController.updateProduct);
productRoutes.delete('/:id', authenticateToken, productController.deleteProduct);

export default productRoutes;
