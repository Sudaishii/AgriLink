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
exports.productRoutes = void 0;
const express_1 = require("express");
const productController = __importStar(require("../controllers/productController"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
exports.productRoutes = (0, express_1.Router)();
exports.productRoutes.get('/farmer/:u_id', productController.getFarmerProducts);
exports.productRoutes.get('/landing/snapshot', productController.getLandingSnapshot);
exports.productRoutes.get('/:id', productController.getProductById);
exports.productRoutes.get('/', productController.getAllProducts);
exports.productRoutes.post('/product', authMiddleware_1.authenticateToken, uploadMiddleware_1.upload.single('p_image'), productController.createProduct);
exports.productRoutes.put('/archive/:id', authMiddleware_1.authenticateToken, productController.archiveProduct);
exports.productRoutes.put('/unarchive/:id', authMiddleware_1.authenticateToken, productController.unarchiveProduct);
exports.productRoutes.put('/:id', authMiddleware_1.authenticateToken, uploadMiddleware_1.upload.single('p_image'), productController.updateProduct);
exports.productRoutes.delete('/:id', authMiddleware_1.authenticateToken, productController.deleteProduct);
exports.default = exports.productRoutes;
