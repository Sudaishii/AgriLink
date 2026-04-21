"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.authRoutes = express_1.default.Router();
exports.authRoutes.post('/register', authController_1.registerController);
exports.authRoutes.post('/login', authController_1.loginController);
exports.authRoutes.post('/logout', authMiddleware_1.authenticateToken, authController_1.logoutController);
exports.authRoutes.get('/verify', authController_1.verifyController);
exports.authRoutes.get('/check-email', authController_1.checkEmailController);
exports.authRoutes.put('/password', authMiddleware_1.authenticateToken, authController_1.updatePasswordController);
// Password Reset Flow
exports.authRoutes.post('/forgot-password', authController_1.forgotPasswordController);
exports.authRoutes.post('/reset-password', authController_1.resetPasswordByTokenController);
exports.default = exports.authRoutes;
