import React, { useState } from 'react';
import { 
  Bell, 
  BellRing, 
  Loader2, 
  X, 
  ShieldAlert,
  Lock
} from 'lucide-react';
import { useFCM } from '@/hooks/useFCM';
import { useShopStore } from '@/store/shopStore';

/**
 * Clean Top Bar Notification Banner
 * When clicked, triggers the browser's native notification prompt directly.
 */
export const NotificationTopBanner: React.FC = () => {
  const { shop } = useShopStore();
  const { permission, loading, isSupported, enableNotifications } = useFCM(shop?.id);
  const [isDismissedTemporarily, setIsDismissedTemporarily] = useState(false);

  if (!isSupported || permission === 'granted' || isDismissedTemporarily) {
    return null;
  }

  const isDenied = permission === 'denied';

  const handleTriggerNative = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    try {
      // Trigger the browser's native notification permission request
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        await enableNotifications();
      }
    } catch (e) {
      console.debug('[FCM] Native permission request:', e);
    }
  };

  return (
    <div
      className={`w-full px-4 py-2 text-xs font-semibold flex items-center justify-between gap-3 shadow-sm transition-all z-40 shrink-0 select-none ${
        isDenied
          ? 'bg-rose-600 dark:bg-rose-700 text-white'
          : 'bg-amber-500 dark:bg-amber-600 text-white'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          {isDenied ? (
            <ShieldAlert size={14} className="text-white" />
          ) : (
            <BellRing size={14} className="text-white animate-bounce" />
          )}
        </div>
        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
          <span className="font-black uppercase tracking-wider text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
            {isDenied ? 'Blocked' : 'Notice'}
          </span>
          <span>
            {isDenied
              ? 'Notifications are blocked in your browser. Click the lock icon 🔒 next to the URL in your address bar to set Notifications to "Allow".'
              : 'Allow notifications to receive instant audio alerts for incoming orders.'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={loading}
          onClick={handleTriggerNative}
          className="px-3 py-1 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 size={13} className="animate-spin text-primary" />
              <span>Checking...</span>
            </>
          ) : isDenied ? (
            <>
              <Lock size={12} className="text-rose-600" />
              <span>Check Permission</span>
            </>
          ) : (
            <>
              <Bell size={12} className="text-amber-600 fill-amber-600" />
              <span>Allow Notifications</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsDismissedTemporarily(true);
            setTimeout(() => setIsDismissedTemporarily(false), 120000);
          }}
          className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Dismiss for 2 minutes"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
