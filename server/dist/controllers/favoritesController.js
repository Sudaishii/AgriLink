"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.favoritesController = void 0;
const favoritesService_1 = require("../services/favoritesService");
exports.favoritesController = {
    addFavorite: async (req, res) => {
        try {
            const userId = req.user?.id;
            const { productId } = req.body;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated.' });
            }
            if (!productId) {
                return res.status(400).json({ message: 'Product ID is required.' });
            }
            await favoritesService_1.favoritesService.addFavorite(parseInt(userId), parseInt(productId));
            res.status(201).json({ message: 'Product added to favorites.' });
        }
        catch (error) {
            console.error('Error adding favorite:', error);
            // Handle potential duplicate entry gracefully if unique key is violated
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Product is already in favorites.' });
            }
            res.status(500).json({ message: 'Failed to add to favorites.', error: error.message });
        }
    },
    removeFavorite: async (req, res) => {
        try {
            const userId = req.user?.id;
            const productId = parseInt(req.params.productId);
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated.' });
            }
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid Product ID.' });
            }
            await favoritesService_1.favoritesService.removeFavorite(parseInt(userId), productId);
            res.json({ message: 'Product removed from favorites.' });
        }
        catch (error) {
            console.error('Error removing favorite:', error);
            res.status(500).json({ message: 'Failed to remove from favorites.', error: error.message });
        }
    },
    getFavorites: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated.' });
            }
            const favorites = await favoritesService_1.favoritesService.getFavoritesByUserId(parseInt(userId));
            res.json({ favorites });
        }
        catch (error) {
            console.error('Error fetching favorites:', error);
            res.status(500).json({ message: 'Failed to fetch favorites.', error: error.message });
        }
    },
    isFavorite: async (req, res) => {
        try {
            const userId = req.user?.id;
            const productId = parseInt(req.params.productId);
            if (!userId) {
                return res.status(401).json({ message: 'User not authenticated.' });
            }
            if (isNaN(productId)) {
                return res.status(400).json({ message: 'Invalid Product ID.' });
            }
            const isFav = await favoritesService_1.favoritesService.isFavorite(parseInt(userId), productId);
            res.json({ isFavorite: isFav });
        }
        catch (error) {
            console.error('Error checking favorite status:', error);
            res.status(500).json({ message: 'Failed to check favorite status.', error: error.message });
        }
    }
};
