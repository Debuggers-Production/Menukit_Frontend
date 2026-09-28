import { create } from 'zustand';

interface HeaderState {
  title: string;
  subtitle: string;
  setTitle: (title: string, subtitle?: string) => void;
  setHeaderTitle: (title: string, subtitle?: string) => void;
}

export const useHeaderStore = create<HeaderState>((set) => ({
  title: '',
  subtitle: '',
  setTitle: (title, subtitle = '') => set({ title, subtitle }),
  setHeaderTitle: (title, subtitle = '') => set({ title, subtitle }),
}));
