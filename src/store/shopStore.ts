import { create } from 'zustand';
import { Shop, Category, MenuItem, ThemeSettings } from '@/types';
import { api } from '@/services/api';

interface ShopState {
  shop: Shop | null;
  categories: Category[];
  menuItems: MenuItem[];
  setShop: (shop: Shop | null) => void;
  setCategories: (categories: Category[] | ((prev: Category[]) => Category[])) => void;
  setMenuItems: (items: MenuItem[] | ((prev: MenuItem[]) => MenuItem[])) => void;
  updateTheme: (themeData: Partial<ThemeSettings>) => Promise<void>;
}

export const useShopStore = create<ShopState>((set) => ({
  shop: null,
  categories: [],
  menuItems: [],
  
  setShop: (shop) => set({ shop }),
  setCategories: (categoriesOrUpdater) => set((state) => ({
    categories: typeof categoriesOrUpdater === 'function'
      ? categoriesOrUpdater(Array.isArray(state.categories) ? state.categories : [])
      : (Array.isArray(categoriesOrUpdater) ? categoriesOrUpdater : [])
  })),
  setMenuItems: (itemsOrUpdater) => set((state) => ({
    menuItems: typeof itemsOrUpdater === 'function'
      ? itemsOrUpdater(Array.isArray(state.menuItems) ? state.menuItems : [])
      : (Array.isArray(itemsOrUpdater) ? itemsOrUpdater : [])
  })),
  updateTheme: async (themeData) => {
    const response = await api.put('/shops/me/theme', themeData);
    set((state) => ({
      shop: state.shop ? { ...state.shop, theme: response.data } : null
    }));
  },
}));
