"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.userRoutes = express_1.default.Router();
// Must be before /:userId to avoid route conflicts
exports.userRoutes.get('/farmers/all', userController_1.getAllFarmers);
exports.userRoutes.get('/public/:userId', userController_1.getPublicFarmerProfile);
exports.userRoutes.get('/contact/:userId', authMiddleware_1.authenticateToken, userController_1.getMessagingContact);
exports.userRoutes.put('/:userId/onboarding', authMiddleware_1.authenticateToken, userController_1.updateOnboardingStatus);
exports.userRoutes.put('/:userId/profile', authMiddleware_1.authenticateToken, uploadMiddleware_1.upload.fields([
    { name: 'farm_image', maxCount: 1 },
    { name: 'farm_gallery_images', maxCount: 10 },
    { name: 'profile_image', maxCount: 1 },
]), userController_1.updateUserProfile);
exports.userRoutes.get('/:userId', authMiddleware_1.authenticateToken, userController_1.getUserProfile);
exports.userRoutes.get('/', authMiddleware_1.authenticateToken, userController_1.getAllUsers);
exports.userRoutes.put('/:userId/status', authMiddleware_1.authenticateToken, userController_1.updateUserStatus);
exports.userRoutes.get('/admin/stats', authMiddleware_1.authenticateToken, userController_1.getAdminStats);
exports.userRoutes.get('/admin/activity', authMiddleware_1.authenticateToken, userController_1.getAdminActivityHistory);
exports.userRoutes.post('/invite-official', authMiddleware_1.authenticateToken, userController_1.inviteOfficial);
exports.default = exports.userRoutes;
