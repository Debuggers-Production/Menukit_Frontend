import { Check, Trash2, Clock, Bell } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { PageHeader } from '@/components/ui/PageHeader';

export function NotificationsPage() {
  const { notifications, markAsRead, clearAll } = useNotificationStore();

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString();
  };

  const handleMarkAllRead = () => {
    markAsRead();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in pb-24 lg:pb-12">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Notifications"
          subtitle="Stay updated with your shop's latest activities."
        />
        
        <div className="hidden sm:flex items-center gap-2">
          {notifications.length > 0 && (
            <>
              <button 
                onClick={handleMarkAllRead}
                className="text-sm text-primary hover:underline flex items-center gap-1 font-medium bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Check size={16} /> Mark all read
              </button>
              <button 
                onClick={clearAll}
                className="text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 size={16} /> Clear All
              </button>
            </>
          )}
        </div>
      </div>

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
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-5 transition-colors flex items-start gap-4 ${notif.is_read ? 'bg-white dark:bg-slate-900' : 'bg-primary/5 dark:bg-primary/10'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl shadow-sm ${notif.type === 'NEW_CUSTOMER' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {notif.type === 'NEW_CUSTOMER' ? '👋' : '⭐'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-base text-slate-800 dark:text-slate-200">
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
                      <Clock size={12} /> {formatTime(notif.created_at)}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {notif.message}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="w-3 h-3 rounded-full bg-primary mt-2 shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                )}
              </div>
            ))}
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
