import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Bell, X, Check, ArrowRight, ShoppingBag, UserPlus, Tag, 
  CreditCard, Coins, CheckCircle2, Trash2, ExternalLink, Send, BellRing, Loader2
} from 'lucide-react';
import { useNotificationStore, Notification } from '@/store/notificationStore';
import { useShopStore } from '@/store/shopStore';
import { useFCM } from '@/hooks/useFCM';
import { cn } from '@/utils/cn';

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function getNotificationCardInfo(title: string, message: string, type: string) {
  const lowerTitle = (title || '').toLowerCase();
  const lowerType = (type || '').toLowerCase();
  const lowerMsg = (message || '').toLowerCase();

  if (lowerTitle.includes('order') || lowerType.includes('order') || lowerMsg.includes('order') || lowerTitle.includes('booking')) {
    return {
      Icon: ShoppingBag,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/80',
      actionUrl: '/orders',
      actionText: 'View order details',
    };
  }
  if (lowerTitle.includes('customer') || lowerTitle.includes('member') || lowerType.includes('customer') || lowerMsg.includes('joined')) {
    return {
      Icon: UserPlus,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-800/80',
      actionUrl: '/members',
      actionText: 'View member profile',
    };
  }
  if (lowerTitle.includes('discount') || lowerTitle.includes('offer') || lowerTitle.includes('promo') || lowerType.includes('discount')) {
    return {
      Icon: Tag,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/80',
      actionUrl: '/discounts',
      actionText: 'View offer details',
    };
  }
  if (lowerTitle.includes('payment') || lowerType.includes('payment') || lowerMsg.includes('payment')) {
    return {
      Icon: CreditCard,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200/80 dark:border-purple-800/80',
      actionUrl: '/settlements',
      actionText: 'View settlement details',
    };
  }
  if (lowerTitle.includes('scheme') || lowerType.includes('scheme') || lowerMsg.includes('scheme')) {
    return {
      Icon: Coins,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/80',
      actionUrl: '/schemes',
      actionText: 'View scheme details',
    };
  }

  return {
    Icon: Bell,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10 border-primary/20',
    actionUrl: '/notifications',
    actionText: 'View details',
  };
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotificationStore();
  const { shop } = useShopStore();
  const { isSupported, permission, loading: fcmLoading, enableNotifications, sendTestNotification } = useFCM(shop?.id);
  const isPushGranted = permission === 'granted';

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const displayedNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const handleNotificationClick = (notif: Notification, targetUrl: string) => {
    if (!notif.is_read) {
      markAsRead([notif.id]);
    }
    setIsOpen(false);
    navigate(targetUrl);
  };

  const handleMarkAllRead = () => {
    markAsRead();
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Trigger Bell Button */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center transition-colors relative cursor-pointer",
          isOpen
            ? "bg-primary/15 text-primary"
            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
        )}
        aria-label="Notifications"
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      >
        <Bell size={14} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9.5px] font-bold text-white bg-rose-500 rounded-full border border-white dark:border-slate-900 shadow-2xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover / Dropdown Flyout Panel */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 z-40 sm:hidden backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          <div 
            className={cn(
              "fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full sm:mt-2 left-2 sm:left-auto",
              "w-auto sm:w-[390px] max-h-[82vh] sm:max-h-[560px] bg-card border border-border/80 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95"
            )}
          >
            {/* Header matching user reference image */}
            <div className="p-3 sm:p-3.5 border-b border-border/80 bg-muted/20 flex items-start justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-8 h-8 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-2xs">
                  <Bell size={15} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-card" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                      unreadCount > 0 
                        ? "bg-amber-500 text-white shadow-2xs" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">Live alerts, customer updates & orders</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Push Notification Status & Test Push Action */}
            {isSupported && (
              <div className="px-3 py-2 bg-muted/40 border-b border-border/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    isPushGranted ? "bg-emerald-500 shadow-2xs shadow-emerald-500/50 " : "bg-amber-500"
                  )} />
                  <span className="text-[11px] font-semibold text-foreground truncate">
                    {isPushGranted ? "Push Alerts Active" : "Push Alerts Off"}
                  </span>
                </div>

                {isPushGranted ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendTestNotification();
                    }}
                    disabled={fcmLoading}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    title="Send a test notification to this browser"
                  >
                    {fcmLoading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    <span>Send Test Push</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      enableNotifications();
                    }}
                    disabled={fcmLoading}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                  >
                    {fcmLoading ? <Loader2 size={11} className="animate-spin" /> : <BellRing size={11} />}
                    <span>Enable Push</span>
                  </button>
                )}
              </div>
            )}

            {/* Filter Tabs & Quick Actions Row */}
            <div className="px-3 py-2 border-b border-border/70 bg-card flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    filter === 'all'
                      ? "bg-primary text-white shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unread')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    filter === 'unread'
                      ? "bg-primary text-white shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                    title="Mark all as read"
                  >
                    <Check size={12} strokeWidth={2.5} />
                    <span>Mark read</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-[11px] font-semibold text-destructive hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                    title="Clear all notifications"
                  >
                    <Trash2 size={11} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Notification List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar overscroll-contain">
              {displayedNotifications.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <div className="w-10 h-10 rounded-md bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-foreground">You're all caught up!</p>
                  <p className="text-[11px] text-muted-foreground">
                    {filter === 'unread' ? 'No unread notifications right now.' : 'No notifications received yet.'}
                  </p>
                </div>
              ) : (
                displayedNotifications.map((notif) => {
                  const info = getNotificationCardInfo(notif.title, notif.message, notif.type);
                  const IconComp = info.Icon;

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif, info.actionUrl)}
                      className={cn(
                        "p-3 rounded-lg border transition-all cursor-pointer relative group space-y-1.5",
                        notif.is_read
                          ? "bg-card border-border/70 hover:border-primary/40 hover:bg-muted/30"
                          : "bg-primary/[0.03] border-primary/30 shadow-2xs hover:border-primary/60"
                      )}
                    >
                      {/* Top Row: Icon + Title + Time + Unread Dot */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0 border", info.iconBg)}>
                            <IconComp size={13} className={info.iconColor} />
                          </div>
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {notif.title || 'Notification Alert'}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-2xs shrink-0" />
                          )}
                        </div>
                      </div>

                      {/* Description Message */}
                      <p className="text-[11.5px] text-muted-foreground font-medium leading-relaxed pl-9 line-clamp-2">
                        {notif.message}
                      </p>

                      {/* Action Link Matching Image 2 */}
                      <div className="pl-9 pt-0.5">
                        <span className="text-[11px] font-bold text-primary group-hover:underline inline-flex items-center gap-1">
                          <span>{info.actionText}</span>
                          <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with Close Notifications / View Full Page */}
            <div className="p-2.5 border-t border-border/80 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ExternalLink size={12} />
                <span>Open Notifications page</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 h-7 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors cursor-pointer border border-border"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
