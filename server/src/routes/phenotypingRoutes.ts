import { Router } from 'express';
import * as phenotypingController from '../controllers/phenotypingController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/farmer/:u_id', authenticateToken, phenotypingController.getFarmerPhenotypingResults);
router.get('/product/:p_id', authenticateToken, phenotypingController.getProductPhenotypingResult);

export default router;
