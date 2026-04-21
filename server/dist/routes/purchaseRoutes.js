"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseRoutes = void 0;
const express_1 = require("express");
const purchaseController = __importStar(require("../controllers/purchaseController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
exports.purchaseRoutes = (0, express_1.Router)();
exports.purchaseRoutes.get('/transactions/all', authMiddleware_1.authenticateToken, purchaseController.getAllTransactions);
exports.purchaseRoutes.post('/', authMiddleware_1.authenticateToken, purchaseController.createPurchase);
exports.purchaseRoutes.get('/farmer/:u_id', authMiddleware_1.authenticateToken, purchaseController.getFarmerOrders);
exports.purchaseRoutes.get('/buyer/:u_id', authMiddleware_1.authenticateToken, purchaseController.getBuyerOrders);
exports.purchaseRoutes.put('/status/:req_id', authMiddleware_1.authenticateToken, purchaseController.updateOrderStatus);
exports.purchaseRoutes.delete('/cancelled/:req_id', authMiddleware_1.authenticateToken, purchaseController.removeCancelledOrder);
exports.purchaseRoutes.delete('/:req_id', authMiddleware_1.authenticateToken, purchaseController.cancelPurchase);
exports.purchaseRoutes.get('/earnings/:u_id', authMiddleware_1.authenticateToken, purchaseController.getEarningSummary);
exports.default = exports.purchaseRoutes;
