import express from 'express';
import {
  updateOnboardingStatus,
  getUserProfile,
  updateUserProfile,
  getAllFarmers,
  getPublicFarmerProfile,
  getMessagingContact,
  getAlertPreferences,
  updateAlertPreferences,
  getAllUsers,
  updateUserStatus,
  getAdminStats,
  getAdminActivityHistory,
  inviteOfficial,
} from '../controllers/userController';
import { upload } from '../middleware/uploadMiddleware';
import { authenticateToken } from '../middleware/authMiddleware';

export const userRoutes = express.Router();

// Must be before /:userId to avoid route conflicts
userRoutes.get('/farmers/all', getAllFarmers);
userRoutes.get('/public/:userId', getPublicFarmerProfile);
userRoutes.get('/contact/:userId', authenticateToken, getMessagingContact);
userRoutes.get('/:userId/alerts', authenticateToken, getAlertPreferences);
userRoutes.put('/:userId/alerts', authenticateToken, updateAlertPreferences);

userRoutes.put('/:userId/onboarding', authenticateToken, updateOnboardingStatus);
userRoutes.put(
  '/:userId/profile',
  authenticateToken,
  upload.fields([
    { name: 'farm_image', maxCount: 1 },
    { name: 'farm_gallery_images', maxCount: 10 },
    { name: 'profile_image', maxCount: 1 },
  ]),
  updateUserProfile
);
userRoutes.get('/:userId', authenticateToken, getUserProfile);
userRoutes.get('/', authenticateToken, getAllUsers);
userRoutes.put('/:userId/status', authenticateToken, updateUserStatus);

userRoutes.get('/admin/stats', authenticateToken, getAdminStats);
userRoutes.get('/admin/activity', authenticateToken, getAdminActivityHistory);
userRoutes.post('/invite-official', authenticateToken, inviteOfficial);

export default userRoutes;
