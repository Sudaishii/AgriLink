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
exports.clearMyCart = exports.removeCartItem = exports.updateCartItem = exports.addToCart = exports.getMyCart = void 0;
const cartService = __importStar(require("../services/cartService"));
const getSessionUserId = (req) => Number(req?.user?.id || 0);
const getMyCart = async (req, res) => {
    try {
        const userId = getSessionUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        const items = await cartService.getCartByUser(userId);
        return res.json({ items });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error fetching cart.', error: error?.message });
    }
};
exports.getMyCart = getMyCart;
const addToCart = async (req, res) => {
    try {
        const userId = getSessionUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        const productId = Number(req.body?.product_id);
        const quantity = Number(req.body?.quantity || 1);
        if (!productId || quantity <= 0) {
            return res.status(400).json({ message: 'Valid product_id and quantity are required.' });
        }
        const result = await cartService.upsertCartItem(userId, productId, quantity);
        return res.json({
            message: result.capped ? 'Quantity capped by current stock.' : 'Item added to cart.',
            item: result.item,
            capped: result.capped,
        });
    }
    catch (error) {
        const message = String(error?.message || 'Error adding item to cart.');
        if (message.includes('own listing'))
            return res.status(400).json({ message });
        if (message.includes('Product not found'))
            return res.status(404).json({ message });
        return res.status(500).json({ message });
    }
};
exports.addToCart = addToCart;
const updateCartItem = async (req, res) => {
    try {
        const userId = getSessionUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        const productId = Number(req.params.productId);
        const quantity = Number(req.body?.quantity);
        if (!productId || !Number.isFinite(quantity) || quantity < 0) {
            return res.status(400).json({ message: 'Valid productId and quantity are required.' });
        }
        const result = await cartService.setCartItemQuantity(userId, productId, quantity);
        return res.json({
            message: result.capped ? 'Quantity capped by current stock.' : 'Cart item updated.',
            item: result.item,
            capped: result.capped,
        });
    }
    catch (error) {
        const message = String(error?.message || 'Error updating cart item.');
        if (message.includes('own listing'))
            return res.status(400).json({ message });
        if (message.includes('Product not found'))
            return res.status(404).json({ message });
        return res.status(500).json({ message });
    }
};
exports.updateCartItem = updateCartItem;
const removeCartItem = async (req, res) => {
    try {
        const userId = getSessionUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        const productId = Number(req.params.productId);
        if (!productId) {
            return res.status(400).json({ message: 'Valid productId is required.' });
        }
        await cartService.removeCartItem(userId, productId);
        return res.json({ message: 'Cart item removed.' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error removing cart item.', error: error?.message });
    }
};
exports.removeCartItem = removeCartItem;
const clearMyCart = async (req, res) => {
    try {
        const userId = getSessionUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        await cartService.clearCartByUser(userId);
        return res.json({ message: 'Cart cleared.' });
    }
    catch (error) {
        return res.status(500).json({ message: 'Error clearing cart.', error: error?.message });
    }
};
exports.clearMyCart = clearMyCart;
