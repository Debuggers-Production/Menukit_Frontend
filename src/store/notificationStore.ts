import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';

export interface Notification {
  id: string;
  shop_id: string;
  type: string;
  title: string;
  message: string;
  metadata_json?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (ids?: string[]) => Promise<void>;
  fetchHistory: () => Promise<void>;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      
      addNotification: (notification) => {
        set((state) => {
          // Check for duplicates
          if (state.notifications.some(n => n.id === notification.id)) {
            return state;
          }
          
          const newNotifications = [notification, ...state.notifications];
          return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter(n => !n.is_read).length
          };
        });
      },

      setNotifications: (newNotifications) => {
        set((state) => {
          // Merge old and new, prioritizing new, to avoid losing local state while avoiding duplicates
          const merged = [...newNotifications];
          const newIds = new Set(newNotifications.map(n => n.id));
          
          for (const old of state.notifications) {
            if (!newIds.has(old.id)) {
              merged.push(old);
            }
          }
          
          // Sort by date descending
          merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          return {
            notifications: merged,
            unreadCount: merged.filter(n => !n.is_read).length
          };
        });
      },

      markAsRead: async (ids?: string[]) => {
        try {
          await api.post('/notifications/mark-read', { notification_ids: ids });
          
          set((state) => {
            const updated = state.notifications.map(n => {
              if (!ids || ids.includes(n.id)) {
                return { ...n, is_read: true };
              }
              return n;
            });
            
            return {
              notifications: updated,
              unreadCount: updated.filter(n => !n.is_read).length
            };
          });
        } catch (error) {
          console.error("Failed to mark notifications as read", error);
        }
      },

      fetchHistory: async () => {
        try {
          const response = await api.get<Notification[]>('/notifications');
          get().setNotifications(response.data);
        } catch (error) {
          console.error("Failed to fetch notification history", error);
        }
      },
      
      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      }
    }),
    {
      name: 'notification-storage',
      // We persist notifications in local storage
      partialize: (state) => ({ notifications: state.notifications }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Recalculate unread count on rehydrate
          state.unreadCount = state.notifications.filter(n => !n.is_read).length;
        }
      }
    }
  )
);
