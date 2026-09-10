import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo, useCallback } from 'react';
import { MenuItem } from '@/types';

export interface CartItem {
  id: string; // Unique instance ID
  menuItem: MenuItem;
  selectedVariantIdx: number;
  selectedAddons: number[]; // Array of indices corresponding to menuItem.addons
  quantity: number;
}

export interface ShopCart {
  items: CartItem[];
  manualDiscountId: string | null;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  isOrderTypeSet: boolean;
}

export const defaultShopCart: ShopCart = {
  items: [],
  manualDiscountId: null,
  orderType: 'takeaway',
  isOrderTypeSet: false,
};

interface CartState {
  carts: Record<string, ShopCart>;

  // Legacy fallback fields
  items: CartItem[];
  shopId: string | null;
  manualDiscountId: string | null;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  isOrderTypeSet: boolean;

  // Scoped actions by shopId
  addToCart: (shopId: string, item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (shopId: string, id: string, delta: number) => void;
  removeFromCart: (shopId: string, id: string) => void;
  clearCart: (shopId?: string) => void;
  setManualDiscount: (shopId: string, discountId: string | null) => void;
  setOrderType: (shopId: string, type: 'dine_in' | 'takeaway' | 'delivery', isSet?: boolean) => void;
  getShopCart: (shopId?: string | null) => ShopCart;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      carts: {},
      items: [],
      shopId: null,
      manualDiscountId: null,
      orderType: 'takeaway',
      isOrderTypeSet: false,

      getShopCart: (shopId) => {
        if (!shopId) return defaultShopCart;
        return get().carts[shopId] || defaultShopCart;
      },

      setOrderType: (shopId, type, isSet = true) => set((state) => {
        if (!shopId) return state;
        const currentCart = state.carts[shopId] || { ...defaultShopCart, items: [] };
        
        // No-op if values haven't changed to prevent render loops
        if (currentCart.orderType === type && currentCart.isOrderTypeSet === isSet && state.orderType === type && state.isOrderTypeSet === isSet) {
          return state;
        }

        const updatedCart = {
          ...currentCart,
          orderType: type,
          isOrderTypeSet: isSet,
        };

        return {
          orderType: type,
          isOrderTypeSet: isSet,
          carts: {
            ...state.carts,
            [shopId]: updatedCart,
          },
        };
      }),

      addToCart: (shopId, item) => set((state) => {
        if (!shopId) return state;
        const currentCart = state.carts[shopId] || { ...defaultShopCart, items: [] };
        const existingItems = currentCart.items || [];

        // Check if exact same configuration already exists in this shop's cart
        const existingItemIndex = existingItems.findIndex(
          (i) =>
            i.menuItem.id === item.menuItem.id &&
            i.selectedVariantIdx === item.selectedVariantIdx &&
            JSON.stringify(i.selectedAddons.slice().sort()) === JSON.stringify(item.selectedAddons.slice().sort())
        );

        let newItems: CartItem[];
        if (existingItemIndex >= 0) {
          newItems = [...existingItems];
          newItems[existingItemIndex] = {
            ...newItems[existingItemIndex],
            quantity: newItems[existingItemIndex].quantity + item.quantity,
          };
        } else {
          newItems = [
            ...existingItems,
            { ...item, id: Math.random().toString(36).substring(7) },
          ];
        }

        const updatedCart = {
          ...currentCart,
          items: newItems,
        };

        return {
          items: newItems,
          shopId,
          carts: {
            ...state.carts,
            [shopId]: updatedCart,
          },
        };
      }),

      updateQuantity: (shopId, id, delta) => set((state) => {
        if (!shopId || !state.carts[shopId]) return state;
        const currentCart = state.carts[shopId];
        const newItems = currentCart.items.map((item) => {
          if (item.id === id) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        });

        const updatedCart = {
          ...currentCart,
          items: newItems,
        };

        return {
          items: newItems,
          carts: {
            ...state.carts,
            [shopId]: updatedCart,
          },
        };
      }),

      removeFromCart: (shopId, id) => set((state) => {
        if (!shopId || !state.carts[shopId]) return state;
        const currentCart = state.carts[shopId];
        const newItems = currentCart.items.filter((item) => item.id !== id);

        const updatedCart = {
          ...currentCart,
          items: newItems,
          manualDiscountId: newItems.length > 0 ? currentCart.manualDiscountId : null,
        };

        return {
          items: newItems,
          carts: {
            ...state.carts,
            [shopId]: updatedCart,
          },
        };
      }),

      clearCart: (shopId) => set((state) => {
        if (!shopId) {
          return { carts: {}, items: [], shopId: null, manualDiscountId: null };
        }
        const currentCart = state.carts[shopId];
        if (!currentCart) return state;

        const updatedCart = {
          ...currentCart,
          items: [],
          manualDiscountId: null,
        };

        return {
          items: [],
          manualDiscountId: null,
          carts: {
            ...state.carts,
            [shopId]: updatedCart,
          },
        };
      }),

      setManualDiscount: (shopId, discountId) => set((state) => {
        if (!shopId) return state;
        const currentCart = state.carts[shopId] || { ...defaultShopCart, items: [] };
        if (currentCart.manualDiscountId === discountId) {
          return state;
        }

        const updatedCart = {
          ...currentCart,
          manualDiscountId: discountId,
        };

        return {
          manualDiscountId: discountId,
          carts: {
            ...state.carts,
            [shopId]: updatedCart,
          },
        };
      }),
    }),
    {
      name: 'menukit-cart',
      migrate: (persistedState: any) => {
        if (!persistedState) return { carts: {} };
        // Migrate from old single-cart structure if carts doesn't exist
        if (!persistedState.carts) {
          const carts: Record<string, ShopCart> = {};
          if (persistedState.shopId && Array.isArray(persistedState.items) && persistedState.items.length > 0) {
            carts[persistedState.shopId] = {
              items: persistedState.items,
              manualDiscountId: persistedState.manualDiscountId || null,
              orderType: persistedState.orderType || 'takeaway',
              isOrderTypeSet: Boolean(persistedState.isOrderTypeSet),
            };
          }
          return {
            ...persistedState,
            carts,
          };
        }
        return persistedState;
      },
    }
  )
);

/**
 * Custom hook to safely interact with a specific shop's cart.
 * Prevents cross-contamination between different shops/hotels.
 * Uses memoized callbacks to avoid infinite render loops.
 */
export function useShopCart(shopId?: string | null) {
  const sId = shopId || '';
  const cart = useCartStore((state) => (sId && state.carts?.[sId]) ? state.carts[sId] : defaultShopCart);
  const addToCartAction = useCartStore((state) => state.addToCart);
  const updateQuantityAction = useCartStore((state) => state.updateQuantity);
  const removeFromCartAction = useCartStore((state) => state.removeFromCart);
  const clearCartAction = useCartStore((state) => state.clearCart);
  const setManualDiscountAction = useCartStore((state) => state.setManualDiscount);
  const setOrderTypeAction = useCartStore((state) => state.setOrderType);

  const cartItemCount = useMemo(() => {
    return (cart.items || []).reduce((acc, item) => acc + item.quantity, 0);
  }, [cart.items]);

  const addToCart = useCallback((itemOrShopId: any, maybeItem?: any) => {
    if (maybeItem !== undefined) {
      addToCartAction(itemOrShopId, maybeItem);
    } else {
      addToCartAction(sId, itemOrShopId);
    }
  }, [sId, addToCartAction]);

  const updateQuantity = useCallback((idOrShopId: string, deltaOrId: any, maybeDelta?: number) => {
    if (maybeDelta !== undefined) {
      updateQuantityAction(idOrShopId, deltaOrId, maybeDelta);
    } else {
      updateQuantityAction(sId, idOrShopId, deltaOrId);
    }
  }, [sId, updateQuantityAction]);

  const removeFromCart = useCallback((idOrShopId: string, maybeId?: string) => {
    if (maybeId !== undefined) {
      removeFromCartAction(idOrShopId, maybeId);
    } else {
      removeFromCartAction(sId, idOrShopId);
    }
  }, [sId, removeFromCartAction]);

  const clearCart = useCallback((targetShopId?: string) => {
    clearCartAction(targetShopId || sId);
  }, [sId, clearCartAction]);

  const setManualDiscount = useCallback((discountIdOrShopId: any, maybeDiscountId?: any) => {
    if (maybeDiscountId !== undefined) {
      setManualDiscountAction(discountIdOrShopId, maybeDiscountId);
    } else {
      setManualDiscountAction(sId, discountIdOrShopId);
    }
  }, [sId, setManualDiscountAction]);

  const setOrderType = useCallback((typeOrShopId: any, typeOrIsSet?: any, maybeIsSet?: boolean) => {
    if (typeof maybeIsSet === 'boolean') {
      setOrderTypeAction(typeOrShopId, typeOrIsSet, maybeIsSet);
    } else if (typeof typeOrIsSet === 'boolean' || typeOrIsSet === undefined) {
      setOrderTypeAction(sId, typeOrShopId, typeOrIsSet ?? true);
    } else {
      setOrderTypeAction(typeOrShopId, typeOrIsSet, true);
    }
  }, [sId, setOrderTypeAction]);

  return {
    items: cart.items || [],
    manualDiscountId: cart.manualDiscountId ?? null,
    orderType: cart.orderType ?? 'takeaway',
    isOrderTypeSet: Boolean(cart.isOrderTypeSet),
    cartItemCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setManualDiscount,
    setOrderType,
  };
}
