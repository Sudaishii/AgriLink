import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  getFarmersByBrgy,
  awardBadge,
  getFarmerBadges,
  revokeBadge,
} from '../controllers/badgeController';

export const badgeRoutes = express.Router();

badgeRoutes.get('/farmers-by-brgy', authenticateToken, getFarmersByBrgy);
badgeRoutes.get('/farmer/:farmerId', authenticateToken, getFarmerBadges);
badgeRoutes.post('/award', authenticateToken, awardBadge);
badgeRoutes.delete('/:badgeId', authenticateToken, revokeBadge);

export default badgeRoutes;
