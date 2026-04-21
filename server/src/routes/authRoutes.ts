import express from 'express';
import { 
    registerController, 
    loginController, 
    logoutController, 
    verifyController, 
    checkEmailController, 
    updatePasswordController,
    forgotPasswordController,
    resetPasswordByTokenController
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

export const authRoutes = express.Router();

authRoutes.post('/register', registerController);
authRoutes.post('/login', loginController);
authRoutes.post('/logout', authenticateToken, logoutController);
authRoutes.get('/verify', verifyController);
authRoutes.get('/check-email', checkEmailController);
authRoutes.put('/password', authenticateToken, updatePasswordController);

// Password Reset Flow
authRoutes.post('/forgot-password', forgotPasswordController);
authRoutes.post('/reset-password', resetPasswordByTokenController);

export default authRoutes;
