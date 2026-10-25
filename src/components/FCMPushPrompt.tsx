import React from 'react';
import { Bell, BellRing, Smartphone, Laptop, CheckCircle, AlertCircle, Send, Loader2 } from 'lucide-react';
import { useFCM } from '@/hooks/useFCM';
import { useShopStore } from '@/store/shopStore';

interface FCMPushPromptProps {
  className?: string;
}

export const FCMPushPrompt: React.FC<FCMPushPromptProps> = ({ className = '' }) => {
  const { shop } = useShopStore();
  const {
    isSupported,
    isConfigured,
    permission,
    token,
    loading,
    deviceInfo,
    enableNotifications,
    sendTestNotification,
  } = useFCM(shop?.id);

  if (!isSupported) {
    return null;
  }

  const isGranted = permission === 'granted';
  const isDev = Boolean(
    import.meta.env.DEV ||
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  );

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
        isGranted
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60'
          : 'bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-primary/10 border-amber-200 dark:border-amber-800/60'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
              isGranted
                ? 'bg-emerald-500 text-white'
                : 'bg-primary text-white'
            }`}
          >
            {isGranted ? <BellRing className="w-5 h-5 animate-pulse" /> : <Bell className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                {isGranted ? 'Push Notifications Active' : 'Enable Instant Push Notifications'}
              </h3>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  isGranted
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                {deviceInfo.platform === 'ios' ? 'iOS' : deviceInfo.platform === 'android' ? 'Android' : 'Desktop / Laptop'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
              {isGranted
                ? 'Your device is configured to receive instant push alerts for new orders, member registrations, and order updates even when this tab is closed.'
                : 'Get notified instantly on your phone or laptop whenever a customer places an order, joins as a new member, or adds items to their table.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:self-center shrink-0">
          {isGranted ? (
            <button
              onClick={sendTestNotification}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Test Push
            </button>
          ) : (
            <button
              onClick={enableNotifications}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <BellRing className="w-4 h-4" />
                  <span>Turn On Notifications</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Registered Token Box - Only shown in development environment */}
      {isDev && token && (
        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Device FCM Token (For Firebase Console Testing):</span>
              <p className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all">{token}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(token);
                import('react-hot-toast').then(({ default: toast }) => toast.success('FCM Token copied!'));
              }}
              className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
            >
              Copy FCM Token
            </button>
          </div>
        </div>
      )}

      {!isConfigured && (
        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Firebase credentials pending in .env configuration. Configure VITE_FIREBASE_* to enable live FCM token generation.</span>
        </div>
      )}
    </div>
  );
};
