import { create } from 'zustand';
import { Shop, Category, MenuItem } from '@/types';

interface ShopState {
  shop: Shop | null;
  categories: Category[];
  menuItems: MenuItem[];
  setShop: (shop: Shop | null) => void;
  setCategories: (categories: Category[]) => void;
  setMenuItems: (items: MenuItem[]) => void;
}

export const useShopStore = create<ShopState>((set) => ({
  shop: null,
  categories: [],
  menuItems: [],
  
  setShop: (shop) => set({ shop }),
  setCategories: (categories) => set({ categories }),
  setMenuItems: (menuItems) => set({ menuItems }),
}));
