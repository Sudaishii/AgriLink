import type { Product } from '../types';

export interface CartItem extends Product {
  quantity: number;
}

const CART_KEY = 'agrilink_cart';

export const getCart = (): CartItem[] => {
  const cart = localStorage.getItem(CART_KEY);
  return cart ? JSON.parse(cart) : [];
};

export const addToCart = (product: Product, quantity: number = 1): { success: boolean; message?: string; capped?: boolean } => {
  const currentUserId = Number(localStorage.getItem('agrilink_id') || localStorage.getItem('agrilink_userId'));
  
  if (product.sellerUserId && currentUserId === product.sellerUserId) {
    return { success: false, message: "You cannot add your own listings to the cart." };
  }

  const cart = getCart();
  const existingItem = cart.find(item => item.id === product.id);
  const currentQty = existingItem ? existingItem.quantity : 0;
  let newQty = currentQty + quantity;
  let capped = false;

  if (newQty > product.stock) {
    newQty = product.stock;
    capped = true;
  }

  if (existingItem) {
    existingItem.quantity = newQty;
  } else {
    cart.push({ ...product, quantity: newQty });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));

  if (capped) {
    return { 
      success: true, 
      message: `Quantity capped at ${product.stock} ${product.unit} (max stock).`,
      capped: true
    };
  }

  return { success: true };
};

export const updateCartQuantity = (productId: number, quantity: number): { success: boolean; message?: string; capped?: boolean } => {
  let cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    let finalQty = Math.max(1, quantity);
    let capped = false;
    if (finalQty > item.stock) {
      finalQty = item.stock;
      capped = true;
    }
    item.quantity = finalQty;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event('cart-updated'));
    
    if (capped) {
      return { 
        success: true, 
        message: `Limited to ${item.stock} ${item.unit} (max stock).`,
        capped: true
      };
    }
    return { success: true };
  }
  return { success: false, message: 'Item not found in cart.' };
};

export const removeFromCart = (productId: number) => {
  const cart = getCart().filter(item => item.id !== productId);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
};

export const clearCart = () => {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event('cart-updated'));
};

export const getCartTotal = (): number => {
  return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

export const getCartCount = (): number => {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
};
