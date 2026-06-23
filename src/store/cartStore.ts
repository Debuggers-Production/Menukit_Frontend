import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem } from '@/types';

export interface CartItem {
  id: string; // Unique instance ID
  menuItem: MenuItem;
  selectedVariantIdx: number;
  selectedAddons: number[]; // Array of indices corresponding to menuItem.addons
  quantity: number;
}

interface CartState {
  items: CartItem[];
  shopId: string | null;
  manualDiscountId: string | null;

  addToCart: (shopId: string, item: Omit<CartItem, 'id'>) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  setManualDiscount: (discountId: string | null) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      shopId: null,
      manualDiscountId: null,

      addToCart: (shopId, item) => set((state) => {
        // If adding to a new shop, clear the existing cart
        if (state.shopId && state.shopId !== shopId) {
          return {
            items: [{ ...item, id: Math.random().toString(36).substring(7) }],
            shopId,
            manualDiscountId: null
          };
        }

        // Check if exact same configuration already exists in cart
        const existingItemIndex = state.items.findIndex(
          i => i.menuItem.id === item.menuItem.id &&
               i.selectedVariantIdx === item.selectedVariantIdx &&
               JSON.stringify(i.selectedAddons.slice().sort()) === JSON.stringify(item.selectedAddons.slice().sort())
        );

        if (existingItemIndex >= 0) {
          const newItems = [...state.items];
          newItems[existingItemIndex].quantity += item.quantity;
          return { items: newItems, shopId };
        }

        return {
          items: [...state.items, { ...item, id: Math.random().toString(36).substring(7) }],
          shopId
        };
      }),

      updateQuantity: (id, delta) => set((state) => ({
        items: state.items.map(item => {
          if (item.id === id) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
      })),

      removeFromCart: (id) => set((state) => {
        const newItems = state.items.filter(item => item.id !== id);
        return {
          items: newItems,
          shopId: newItems.length > 0 ? state.shopId : null,
          manualDiscountId: newItems.length > 0 ? state.manualDiscountId : null
        };
      }),

      clearCart: () => set({ items: [], shopId: null, manualDiscountId: null }),

      setManualDiscount: (discountId) => set({ manualDiscountId: discountId }),
    }),
    {
      name: 'menukit-cart',
    }
  )
);
