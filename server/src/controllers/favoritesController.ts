import { Request, Response } from 'express';
import { favoritesService } from '../services/favoritesService';

export const favoritesController = {
  addFavorite: async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const { productId } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
      }
      if (!productId) {
        return res.status(400).json({ message: 'Product ID is required.' });
      }

      await favoritesService.addFavorite(parseInt(userId), parseInt(productId));
      res.status(201).json({ message: 'Product added to favorites.' });
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      // Handle potential duplicate entry gracefully if unique key is violated
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Product is already in favorites.' });
      }
      res.status(500).json({ message: 'Failed to add to favorites.', error: error.message });
    }
  },

  removeFavorite: async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const productId = parseInt(req.params.productId as string);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
      }
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid Product ID.' });
      }

      await favoritesService.removeFavorite(parseInt(userId), productId);
      res.json({ message: 'Product removed from favorites.' });
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      res.status(500).json({ message: 'Failed to remove from favorites.', error: error.message });
    }
  },

  getFavorites: async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
      }

      const favorites = await favoritesService.getFavoritesByUserId(parseInt(userId));
      res.json({ favorites });
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ message: 'Failed to fetch favorites.', error: error.message });
    }
  },

  isFavorite: async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      const productId = parseInt(req.params.productId as string);

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
      }
      if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid Product ID.' });
      }

      const isFav = await favoritesService.isFavorite(parseInt(userId), productId);
      res.json({ isFavorite: isFav });
    } catch (error: any) {
      console.error('Error checking favorite status:', error);
      res.status(500).json({ message: 'Failed to check favorite status.', error: error.message });
    }
  }
};
