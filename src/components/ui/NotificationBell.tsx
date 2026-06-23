import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { useNavigate } from 'react-router';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotificationStore();
  const navigate = useNavigate();

  const handleToggle = () => {
    // Navigate to notifications page
    navigate('/notifications');
    
    // Auto mark as read when clicking the bell
    if (unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      markAsRead(unreadIds);
    }
  };

  return (
    <button 
      onClick={handleToggle}
      className="relative p-2 text-slate-500 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full"
      aria-label="Notifications"
    >
      <Bell size={24} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 border-2 border-white rounded-full">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
