import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Check, Trash2, Clock, Bell, ShoppingBag, CreditCard, Tag, 
  UserPlus, CheckCircle2, Coins, Search, X, ArrowRight, Filter
} from 'lucide-react';
import { useNotificationStore, Notification } from '@/store/notificationStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { FCMPushPrompt } from '@/components/FCMPushPrompt';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from 'react-hot-toast';
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
      category: 'orders',
      Icon: ShoppingBag,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/80',
      actionUrl: '/orders',
      actionText: 'View order details',
    };
  }
  if (lowerTitle.includes('customer') || lowerTitle.includes('member') || lowerType.includes('customer') || lowerMsg.includes('joined')) {
    return {
      category: 'members',
      Icon: UserPlus,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-800/80',
      actionUrl: '/members',
      actionText: 'View member profile',
    };
  }
  if (lowerTitle.includes('discount') || lowerTitle.includes('offer') || lowerTitle.includes('promo') || lowerType.includes('discount')) {
    return {
      category: 'offers',
      Icon: Tag,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/80',
      actionUrl: '/discounts',
      actionText: 'View offer details',
    };
  }
  if (lowerTitle.includes('payment') || lowerType.includes('payment') || lowerMsg.includes('payment')) {
    return {
      category: 'payments',
      Icon: CreditCard,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200/80 dark:border-purple-800/80',
      actionUrl: '/settlements',
      actionText: 'View settlement details',
    };
  }
  if (lowerTitle.includes('scheme') || lowerType.includes('scheme') || lowerMsg.includes('scheme')) {
    return {
      category: 'schemes',
      Icon: Coins,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/80',
      actionUrl: '/schemes',
      actionText: 'View scheme details',
    };
  }

  return {
    category: 'system',
    Icon: Bell,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10 border-primary/20',
    actionUrl: '/notifications',
    actionText: 'View details',
  };
}

export function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, clearAll } = useNotificationStore();
  const { setTitle } = useHeaderStore();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState<'all' | 'unread' | 'orders' | 'members' | 'payments'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    setTitle('Notifications');
  }, [setTitle]);

  const handleMarkAllRead = async () => {
    try {
      await markAsRead();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark notifications as read');
    }
  };

  const handleConfirmClearAll = async () => {
    setIsClearing(true);
    try {
      await clearAll();
      setIsClearConfirmOpen(false);
      toast.success('All notifications cleared');
    } catch {
      toast.error('Failed to clear notifications');
    } finally {
      setIsClearing(false);
    }
  };

  const handleNotificationClick = (notif: Notification, targetUrl: string) => {
    if (!notif.is_read) {
      markAsRead([notif.id]);
    }
    if (targetUrl !== '/notifications') {
      navigate(targetUrl);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      const info = getNotificationCardInfo(notif.title, notif.message, notif.type);
      
      // Category filter
      if (activeCategory === 'unread' && notif.is_read) return false;
      if (activeCategory === 'orders' && info.category !== 'orders') return false;
      if (activeCategory === 'members' && info.category !== 'members') return false;
      if (activeCategory === 'payments' && info.category !== 'payments') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (notif.title || '').toLowerCase().includes(q);
        const matchesMsg = (notif.message || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg) return false;
      }

      return true;
    });
  }, [notifications, activeCategory, searchQuery]);

  return (
    <div className="space-y-3.5 w-full animate-fade-in pb-20 w-full">
      {/* Top Bar Header Actions */}
      <HeaderActions>
        {notifications.length > 0 && (
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button 
                type="button"
                onClick={handleMarkAllRead}
                className="h-8 px-2.5 rounded-md text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              >
                <Check size={13} strokeWidth={2.5} />
                <span>Mark all read</span>
              </button>
            )}
            <button 
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              className="h-8 px-2.5 rounded-md text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <Trash2 size={13} />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </HeaderActions>

      {/* Push Notification Permission Card */}
      <FCMPushPrompt />

      {/* Sticky Filter & Search Toolbar */}
      <div className="sticky top-[-12px] sm:top-[-16px] lg:top-[-20px] z-20 bg-background/95 backdrop-blur-md py-2 -mx-3 px-3 sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5 border-b border-border/80 mb-3 space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-2 sm:p-2.5 rounded-xl border border-border/80 shadow-2xs">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0",
                activeCategory === 'all'
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('unread')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0",
                activeCategory === 'unread'
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('orders')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0",
                activeCategory === 'orders'
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Orders
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('members')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0",
                activeCategory === 'members'
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Members
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('payments')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0",
                activeCategory === 'payments'
                  ? "bg-primary text-white shadow-2xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Payments
            </button>
          </div>

          {/* Search Input - Prominent, spacious, high-contrast */}
          <div className="relative w-full sm:w-72 md:w-80 lg:w-96 shrink-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-10 pr-9 h-10 bg-background border border-input hover:border-primary/50 focus:border-primary rounded-xl text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-full hover:bg-muted transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar Action Buttons (Accessible on both Mobile & Desktop inside the page) */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              {unreadCount > 0 ? (
                <span>
                  <strong className="text-foreground">{unreadCount}</strong> unread of {notifications.length} notifications
                </span>
              ) : (
                <span>All caught up • {notifications.length} total</span>
              )}
            </span>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  type="button"
                  onClick={handleMarkAllRead}
                  className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                >
                  <Check size={13} strokeWidth={2.5} />
                  <span>Mark all read</span>
                </button>
              )}
              <button 
                type="button"
                onClick={() => setIsClearConfirmOpen(true)}
                className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications Card List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-card rounded-lg border border-border/80 shadow-2xs p-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Bell size={22} />
          </div>
          <h3 className="font-bold text-sm text-foreground">You're all caught up!</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? 'No notifications matched your search keywords.'
              : activeCategory === 'unread'
              ? 'No unread notifications at the moment.'
              : 'New alerts for orders, customer registrations, and payments will appear here.'}
          </p>
          {(searchQuery || activeCategory !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="mt-2 px-3 h-8 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors cursor-pointer border border-border"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notif) => {
            const info = getNotificationCardInfo(notif.title, notif.message, notif.type);
            const IconComp = info.Icon;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif, info.actionUrl)}
                className={cn(
                  "p-3.5 rounded-lg border transition-all cursor-pointer relative group space-y-2 shadow-2xs",
                  notif.is_read
                    ? "bg-card border-border/80 hover:border-primary/40 hover:bg-muted/30"
                    : "bg-primary/[0.04] border-primary/30 hover:border-primary/60"
                )}
              >
                {/* Header row: Icon + Title + Time + Unread indicator */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0 border shadow-2xs", info.iconBg)}>
                      <IconComp size={15} className={info.iconColor} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {notif.title || 'Notification Alert'}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Clock size={10} />
                        <span>{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10.5px] font-mono text-muted-foreground">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                    {!notif.is_read ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs shrink-0" title="Unread" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" title="Read" />
                    )}
                  </div>
                </div>

                {/* Body Message */}
                <p className="text-xs text-muted-foreground font-medium leading-relaxed pl-10.5">
                  {notif.message}
                </p>

                {/* Footer action link */}
                <div className="pl-10.5 pt-0.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-primary group-hover:underline inline-flex items-center gap-1">
                    <span>{info.actionText}</span>
                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                  </span>

                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead([notif.id]);
                      }}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md hover:bg-muted transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={handleConfirmClearAll}
        title="Clear All Notifications"
        message="Are you sure you want to permanently clear all notifications? This action cannot be undone."
        confirmText="Clear All"
        isDestructive={true}
        isLoading={isClearing}
      />
    </div>
  );
}
