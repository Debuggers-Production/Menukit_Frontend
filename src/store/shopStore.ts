import { create } from 'zustand';
import { Shop, Category, MenuItem, ThemeSettings } from '@/types';
import { api } from '@/services/api';

interface ShopState {
  shop: Shop | null;
  categories: Category[];
  menuItems: MenuItem[];
  setShop: (shop: Shop | null) => void;
  setCategories: (categories: Category[]) => void;
  setMenuItems: (items: MenuItem[]) => void;
  updateTheme: (themeData: Partial<ThemeSettings>) => Promise<void>;
}

export const useShopStore = create<ShopState>((set) => ({
  shop: null,
  categories: [],
  menuItems: [],
  
  setShop: (shop) => set({ shop }),
  setCategories: (categories) => set({ categories }),
  setMenuItems: (menuItems) => set({ menuItems }),
  updateTheme: async (themeData) => {
    const response = await api.put('/shops/me/theme', themeData);
    set((state) => ({
      shop: state.shop ? { ...state.shop, theme: response.data } : null
    }));
  },
}));
