import { useEffect } from 'react';
import { Check, Trash2, Clock, Bell, ShoppingBag, CreditCard, Star, UserPlus, CheckCircle2, Trophy } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';

export function NotificationsPage() {
  const { notifications, markAsRead, clearAll } = useNotificationStore();
  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle('Notifications', "Stay updated with your shop's latest activities.");
  }, [setTitle]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString();
  };

  const handleMarkAllRead = () => {
    markAsRead();
  };

  const getNotificationDetails = (title: string, message: string, type: string) => {
    let cleanTitle = title || '';
    
    // Replace underscores with spaces and collapse multiline strings into a single line with bullet separator
    cleanTitle = cleanTitle
      .replace(/_/g, ' ')
      .split(/[\r\n]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .join(' • ');

    // Standardize title format e.g. "Order #4396d2d8 Pending Vendor" -> "Order #4396d2d8 • Pending Vendor"
    cleanTitle = cleanTitle.replace(/(Order\s+#[a-f0-9]+)\s+([A-Za-z])/i, '$1 • $2');

    // Title case words nicely
    cleanTitle = cleanTitle.replace(/\b[a-z]/g, (char) => char.toUpperCase());

    const lowerTitle = cleanTitle.toLowerCase();
    const lowerType = (type || '').toLowerCase();
    const lowerMsg = (message || '').toLowerCase();

    if (lowerTitle.includes('review') || lowerType.includes('review') || lowerMsg.includes('review')) {
      return {
        title: cleanTitle || 'New Food Review',
        Icon: Star,
        bgClass: 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
      };
    }
    if (lowerTitle.includes('customer') || lowerType.includes('customer') || lowerMsg.includes('customer')) {
      return {
        title: cleanTitle || 'New Customer Registered',
        Icon: UserPlus,
        bgClass: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
      };
    }
    if (lowerTitle.includes('payment') || lowerType.includes('payment') || lowerMsg.includes('payment')) {
      return {
        title: cleanTitle || 'Payment Notification',
        Icon: CreditCard,
        bgClass: 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
      };
    }
    if (lowerTitle.includes('delivered') || lowerTitle.includes('completed') || lowerMsg.includes('delivered')) {
      return {
        title: cleanTitle || 'Order Completed',
        Icon: CheckCircle2,
        bgClass: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
      };
    }
    if (lowerTitle.includes('order') || lowerType.includes('order') || lowerMsg.includes('order')) {
      return {
        title: cleanTitle || 'Order Notification',
        Icon: ShoppingBag,
        bgClass: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
      };
    }
    if (lowerTitle.includes('contest') || lowerType.includes('contest') || lowerMsg.includes('contest')) {
      return {
        title: cleanTitle || 'Contest Alert',
        Icon: Trophy,
        bgClass: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-600 dark:text-yellow-400',
      };
    }

    return {
      title: cleanTitle || 'Shop Notification',
      Icon: Bell,
      bgClass: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    };
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-fade-in pb-24 lg:pb-12">
      {/* Top Bar Header Actions */}
      <HeaderActions>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleMarkAllRead}
              className="text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-950/60 flex items-center gap-1.5 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <Check size={14} className="text-amber-600 dark:text-amber-400" />
              <span>Mark all read</span>
            </button>
            <button 
              onClick={clearAll}
              className="text-xs text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-800 flex items-center gap-1.5 font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <Trash2 size={14} />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </HeaderActions>


      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">You're all caught up!</h3>
            <p className="mt-1">No new notifications at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {notifications.map((notif) => {
              const { title, Icon, bgClass } = getNotificationDetails(notif.title, notif.message, notif.type);
              
              return (
                <div 
                  key={notif.id} 
                  className={`p-4 sm:p-5 transition-colors flex items-start gap-3.5 sm:gap-4 ${notif.is_read ? 'bg-white dark:bg-slate-900' : 'bg-primary/5 dark:bg-primary/10'}`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${bgClass}`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                        {title}
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <Clock size={11} /> {formatTime(notif.created_at)}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Action Buttons (Floating at Bottom) */}
      {notifications.length > 0 && (
        <div className="sm:hidden fixed bottom-[72px] left-0 right-0 z-40 flex justify-center pointer-events-none pb-2 px-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-700 rounded-full flex items-center p-1.5 gap-1 pointer-events-auto">
            <button 
              onClick={handleMarkAllRead}
              className="text-[11px] text-primary hover:bg-primary/10 flex items-center gap-1.5 font-bold px-3 py-2 rounded-full transition-colors"
            >
              <Check size={14} strokeWidth={2.5} /> Mark all read
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
            <button 
              onClick={clearAll}
              className="text-[11px] text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5 font-bold px-3 py-2 rounded-full transition-colors"
            >
              <Trash2 size={14} strokeWidth={2.5} /> Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
