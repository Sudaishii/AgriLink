import { API_BASE_URL } from '../api/apiConfig';
import type { Product } from '../types';

export interface CartItem extends Product {
  quantity: number;
}

type CartResult = { success: boolean; message?: string; capped?: boolean };

const LEGACY_CART_KEY = 'agrilink_cart';
const CART_KEY_PREFIX = 'agrilink_cart_';

const getCurrentUserId = (): number => {
  const raw = localStorage.getItem('agrilink_id') || localStorage.getItem('agrilink_userId') || '';
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getScopedCartKey = (): string | null => {
  const userId = getCurrentUserId();
  return userId > 0 ? `${CART_KEY_PREFIX}${userId}` : null;
};

const parseCartItems = (raw: string | null): CartItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
};

const writeLocalCart = (items: CartItem[]): void => {
  const key = getScopedCartKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(items));
};

const clearLocalCart = (): void => {
  const key = getScopedCartKey();
  if (key) localStorage.removeItem(key);
};

const emitCartUpdated = (): void => {
  window.dispatchEvent(new Event('cart-updated'));
};

const getAuthToken = (): string => localStorage.getItem('agrilink_token') || '';

const hasSession = (): boolean =>
  localStorage.getItem('agrilink_isLoggedIn') === 'true' &&
  Boolean(getAuthToken()) &&
  getCurrentUserId() > 0;

const migrateLegacyCartForCurrentUser = (): void => {
  const scopedKey = getScopedCartKey();
  if (!scopedKey) return;
  if (localStorage.getItem(scopedKey)) return;
  const legacyRaw = localStorage.getItem(LEGACY_CART_KEY);
  if (!legacyRaw) return;
  const legacyItems = parseCartItems(legacyRaw);
  if (legacyItems.length > 0) {
    localStorage.setItem(scopedKey, JSON.stringify(legacyItems));
  }
  localStorage.removeItem(LEGACY_CART_KEY);
};

export const getCart = (): CartItem[] => {
  const scopedKey = getScopedCartKey();
  if (!scopedKey) return [];
  migrateLegacyCartForCurrentUser();
  return parseCartItems(localStorage.getItem(scopedKey));
};

export const syncCartFromServer = async (): Promise<CartItem[]> => {
  if (!hasSession()) {
    clearLocalCart();
    emitCartUpdated();
    return [];
  }

  const token = getAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      clearLocalCart();
      emitCartUpdated();
      return [];
    }

    if (!res.ok) {
      return getCart();
    }

    const data = (await res.json()) as { items?: CartItem[] };
    const items = Array.isArray(data.items) ? data.items : [];
    writeLocalCart(items);
    localStorage.removeItem(LEGACY_CART_KEY);
    emitCartUpdated();
    return items;
  } catch {
    return getCart();
  }
};

const postCart = async (payload: { product_id: number; quantity: number }): Promise<CartResult> => {
  if (!hasSession()) {
    return { success: false, message: 'Please sign in to add items to your cart.' };
  }
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: body?.message || 'Could not add item to cart.' };
  }
  await syncCartFromServer();
  return { success: true, message: body?.message, capped: Boolean(body?.capped) };
};

const putCart = async (productId: number, quantity: number): Promise<CartResult> => {
  if (!hasSession()) {
    return { success: false, message: 'Please sign in to update cart items.' };
  }
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/cart/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantity }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: body?.message || 'Could not update cart item.' };
  }
  await syncCartFromServer();
  return { success: true, message: body?.message, capped: Boolean(body?.capped) };
};

const deleteCartItem = async (productId: number): Promise<CartResult> => {
  if (!hasSession()) {
    return { success: false, message: 'Please sign in to update cart items.' };
  }
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/cart/${productId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, message: body?.message || 'Could not remove cart item.' };
  }
  await syncCartFromServer();
  return { success: true, message: body?.message };
};

export const addToCart = async (
  product: Product,
  quantity: number = 1
): Promise<{ success: boolean; message?: string; capped?: boolean }> => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    return { success: false, message: 'Please sign in to add items to your cart.' };
  }

  if (product.sellerUserId && currentUserId === product.sellerUserId) {
    return { success: false, message: 'You cannot add your own listings to the cart.' };
  }

  return postCart({
    product_id: Number(product.id),
    quantity: Number(quantity || 1),
  });
};

export const updateCartQuantity = async (
  productId: number,
  quantity: number
): Promise<{ success: boolean; message?: string; capped?: boolean }> => {
  const normalized = Math.max(0, Number(quantity || 0));
  return putCart(productId, normalized);
};

export const removeFromCart = async (productId: number): Promise<void> => {
  await deleteCartItem(productId);
};

export const clearCart = async (): Promise<void> => {
  if (!hasSession()) {
    clearLocalCart();
    emitCartUpdated();
    return;
  }
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}/cart`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    clearLocalCart();
    localStorage.removeItem(LEGACY_CART_KEY);
    emitCartUpdated();
  }
};

export const getCartTotal = (): number => {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
};

export const getCartCount = (): number => {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
};
