import { Response } from 'express';
import * as cartService from '../services/cartService';

const getSessionUserId = (req: any): number => Number(req?.user?.id || 0);

export const getMyCart = async (req: any, res: Response) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    const items = await cartService.getCartByUser(userId);
    return res.json({ items });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error fetching cart.', error: error?.message });
  }
};

export const addToCart = async (req: any, res: Response) => {
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
  } catch (error: any) {
    const message = String(error?.message || 'Error adding item to cart.');
    if (message.includes('own listing')) return res.status(400).json({ message });
    if (message.includes('Product not found')) return res.status(404).json({ message });
    return res.status(500).json({ message });
  }
};

export const updateCartItem = async (req: any, res: Response) => {
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
  } catch (error: any) {
    const message = String(error?.message || 'Error updating cart item.');
    if (message.includes('own listing')) return res.status(400).json({ message });
    if (message.includes('Product not found')) return res.status(404).json({ message });
    return res.status(500).json({ message });
  }
};

export const removeCartItem = async (req: any, res: Response) => {
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
  } catch (error: any) {
    return res.status(500).json({ message: 'Error removing cart item.', error: error?.message });
  }
};

export const clearMyCart = async (req: any, res: Response) => {
  try {
    const userId = getSessionUserId(req);
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    await cartService.clearCartByUser(userId);
    return res.json({ message: 'Cart cleared.' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Error clearing cart.', error: error?.message });
  }
};
