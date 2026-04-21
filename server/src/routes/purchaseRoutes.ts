import { Router } from 'express';
import * as purchaseController from '../controllers/purchaseController';
import { authenticateToken } from '../middleware/authMiddleware';

export const purchaseRoutes = Router();

purchaseRoutes.get('/transactions/all', authenticateToken, purchaseController.getAllTransactions);
purchaseRoutes.post('/', authenticateToken, purchaseController.createPurchase);
purchaseRoutes.get('/farmer/:u_id', authenticateToken, purchaseController.getFarmerOrders);
purchaseRoutes.get('/buyer/:u_id', authenticateToken, purchaseController.getBuyerOrders);
purchaseRoutes.put('/status/:req_id', authenticateToken, purchaseController.updateOrderStatus);
purchaseRoutes.delete('/cancelled/:req_id', authenticateToken, purchaseController.removeCancelledOrder);
purchaseRoutes.delete('/:req_id', authenticateToken, purchaseController.cancelPurchase);
purchaseRoutes.get('/earnings/:u_id', authenticateToken, purchaseController.getEarningSummary);

export default purchaseRoutes;
