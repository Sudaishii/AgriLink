import { Router } from 'express';
import * as systemLogController from '../controllers/systemLogController';
import { authenticateToken } from '../middleware/authMiddleware';

export const systemLogRoutes = Router();

systemLogRoutes.get('/', authenticateToken, systemLogController.getAllLogs);
systemLogRoutes.post('/', authenticateToken, systemLogController.createLog);

export default systemLogRoutes;
