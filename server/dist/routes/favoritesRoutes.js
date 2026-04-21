"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const favoritesController_1 = require("../controllers/favoritesController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// POST /favorites - Add a product to favorites
router.post('/', authMiddleware_1.authenticateToken, favoritesController_1.favoritesController.addFavorite);
// DELETE /favorites/:productId - Remove a product from favorites
router.delete('/:productId', authMiddleware_1.authenticateToken, favoritesController_1.favoritesController.removeFavorite);
// GET /favorites - Get all favorite products for the authenticated user
router.get('/', authMiddleware_1.authenticateToken, favoritesController_1.favoritesController.getFavorites);
// GET /favorites/is/:productId - Check if a specific product is a favorite for the authenticated user
router.get('/is/:productId', authMiddleware_1.authenticateToken, favoritesController_1.favoritesController.isFavorite);
exports.default = router;
