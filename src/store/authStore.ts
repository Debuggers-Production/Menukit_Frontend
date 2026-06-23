import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { api } from '@/services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  changeEmail: (oldEmailOtp: string, newEmail: string, newEmailOtp: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, code: string) => {
        try {
          const res = await api.post('/auth/verify-otp', { email, code });
          const { access_token, refresh_token } = res.data;
          
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          // Fetch user profile immediately
          const userRes = await api.get('/auth/me');
          set({ user: userRes.data, isAuthenticated: true });
        } catch (error) {
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (e) {
          // Ignore error on logout
        } finally {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, isAuthenticated: false });
          window.location.href = '/login';
        }
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const token = localStorage.getItem('access_token');
          if (!token) {
            set({ isAuthenticated: false, user: null, isLoading: false });
            return;
          }
          
          const res = await api.get('/auth/me');
          set({ user: res.data, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isAuthenticated: false, user: null, isLoading: false });
        }
      },

      changeEmail: async (old_email_otp: string, new_email: string, new_email_otp: string) => {
        await api.post('/auth/change-email', { old_email_otp, new_email, new_email_otp });
        set((state) => ({
          user: state.user ? { ...state.user, email: new_email } : null
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
