"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const badgeController_1 = require("../controllers/badgeController");
exports.badgeRoutes = express_1.default.Router();
exports.badgeRoutes.get('/farmers-by-brgy', authMiddleware_1.authenticateToken, badgeController_1.getFarmersByBrgy);
exports.badgeRoutes.get('/farmer/:farmerId', authMiddleware_1.authenticateToken, badgeController_1.getFarmerBadges);
exports.badgeRoutes.post('/award', authMiddleware_1.authenticateToken, badgeController_1.awardBadge);
exports.badgeRoutes.delete('/:badgeId', authMiddleware_1.authenticateToken, badgeController_1.revokeBadge);
exports.default = exports.badgeRoutes;
