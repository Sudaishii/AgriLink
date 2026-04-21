import { Router } from 'express';
import { reviewController } from '../controllers/reviewController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/farmer/:farmerId', reviewController.getFarmerServiceReviews);
router.post('/farmer-service', authenticateToken, reviewController.addFarmerServiceReview);
router.get('/:productId', reviewController.getReviews);
router.post('/', authenticateToken, reviewController.addReview);

export default router;
