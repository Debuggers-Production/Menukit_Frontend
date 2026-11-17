import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { createPortal } from 'react-dom';
import { 
  Coffee, 
  QrCode, 
  Eye, 
  ArrowRight,
  Clock,
  Search,
  ExternalLink,
  Plus,
  Star,
  Users,
  ShoppingBag,
  Coins,
  X
} from 'lucide-react';
import { api } from '@/services/api';
import { analyticsService } from '@/services/analyticsService';
import { membershipService } from '@/services/memberships';
import { useShopStore } from '@/store/shopStore';
import { isSchemeEnabledShop } from '@/config/businessCategories';
import { WhatsNewModal } from '@/components/WhatsNewModal';
import { StatSummaryCard } from '@/components/ui/StatSummaryCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/ui/PageContainer';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { CreateOrderModal } from '@/pages/orders/CreateOrderModal';
import { formatLocalDateTime, formatLocalDate } from '@/utils/dateTime';

export function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [memberStats, setMemberStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitySearch, setActivitySearch] = useState('');
  const [isSearchingActivity, setIsSearchingActivity] = useState(false);
  const [topSearches, setTopSearches] = useState<any[]>([]);
  const [topReviews, setTopReviews] = useState<any[]>([]);
  const { shop, setShop } = useShopStore();
  const [isLoading, setIsLoading] = useState(() => !shop);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const navigate = useNavigate();
  const { setTitle } = useHeaderStore();

  const isSchemeShop = isSchemeEnabledShop(shop?.category);
  const [showSchemeBanner, setShowSchemeBanner] = useState(() => {
    try {
      return localStorage.getItem('menukit_dismiss_scheme_banner_v2_1_0') !== 'true';
    } catch {
      return true;
    }
  });
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);

  const handleDismissSchemeBanner = () => {
    setShowSchemeBanner(false);
    try {
      localStorage.setItem('menukit_dismiss_scheme_banner_v2_1_0', 'true');
    } catch {}
  };


  useEffect(() => {
    if (!shop) return;
    const timer = setTimeout(async () => {
      if (activitySearch !== undefined) {
        setIsSearchingActivity(true);
        try {
          const recent = await analyticsService.getRecentActivities(activitySearch);
          setActivities(recent);
        } catch (e) {
          console.error("Failed to search activities", e);
        } finally {
          setIsSearchingActivity(false);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [activitySearch, shop]);

  // Automatically trigger the browser's native notification prompt on page visit or first click
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default' && shop?.id) {
      const triggerNativePrompt = async () => {
        try {
          const res = await Notification.requestPermission();
          if (res === 'granted') {
            import('@/services/fcm').then(({ requestFCMToken }) => {
              requestFCMToken(shop.id);
            });
          }
        } catch (e) {
          console.debug('[FCM] Native prompt notice:', e);
        }
      };

      // Attempt immediate trigger
      triggerNativePrompt();

      // Also listen on first user interaction to satisfy browser gesture requirement
      window.addEventListener('click', triggerNativePrompt, { once: true });
      return () => window.removeEventListener('click', triggerNativePrompt);
    }
  }, [shop?.id]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        let activeShop = shop;
        
        // If shop is not loaded or missing ID, fetch it first
        if (!activeShop?.id) {
          try {
            const shopRes = await api.get('/shops/me');
            if (shopRes.data?.id) {
              activeShop = shopRes.data;
              setShop(shopRes.data);
              localStorage.setItem('current_shop_id', shopRes.data.id);
            } else {
              // Fallback to my-shops
              const myShopsRes = await api.get('/shops/my-shops');
              const allShops = [...(myShopsRes.data?.owned || []), ...(myShopsRes.data?.employed || [])];
              if (allShops.length > 0) {
                const firstShop = allShops[0];
                const targetId = firstShop.id || firstShop.shop?.id;
                if (targetId) {
                  localStorage.setItem('current_shop_id', targetId);
                  const freshShopRes = await api.get('/shops/me', { headers: { 'X-Shop-Id': targetId } });
                  if (freshShopRes.data?.id) {
                    activeShop = freshShopRes.data;
                    setShop(freshShopRes.data);
                  }
                }
              }
            }
          } catch (shopErr) {
            console.error('Failed to resolve shop in DashboardPage:', shopErr);
          }
        }

        if (activeShop?.id) {
          const [analyticsRes, mStats] = await Promise.all([
            api.get('/analytics/dashboard').catch(err => {
              console.error('Failed to load dashboard analytics:', err);
              return null;
            }),
            membershipService.getAnalytics(activeShop.id).catch(() => ({ total_members: 0 }))
          ]);

          if (analyticsRes?.data) {
            setStats(analyticsRes.data.overview);
            setActivities(analyticsRes.data.recent_activities || []);
            setTopSearches(analyticsRes.data.top_searches || []);
            setTopReviews(analyticsRes.data.top_reviews || []);
          }
          if (mStats) {
            setMemberStats(mStats);
          }
        }
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [shop?.id]);

  useEffect(() => {
    if (shop) {
      setTitle('Overview');
    } else {
      setTitle('Overview');
    }
  }, [shop, setTitle]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  // If no shop is created yet, prompt them to create one
  if (!shop?.id) {
    return (
      <PageContainer className="flex items-center justify-center">
        <EmptyState
          icon={<Store size={24} />}
          title="Welcome to Menukit!"
          description="Let's get started by setting up your restaurant profile. It only takes a minute."
          action={
            <Button size="lg" onClick={() => navigate('/shop-setup?create=true', { state: { createNew: true } })}>
              Create Your Shop Profile
              <ArrowRight className="ml-2" size={18} />
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const statCards = [
    { title: 'Total Menu Items', value: stats?.total_menu_items || 0, icon: Coffee, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { title: 'Verified Members', value: memberStats?.manually_added || 0, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { title: 'QR Scans', value: stats?.total_qr_scans || 0, icon: QrCode, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { title: 'Menu Views', value: stats?.total_menu_views || 0, icon: Eye, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  ];

  return (
    <PageContainer className="pb-20">
      {/* Dashboard Content */}
      <div className="space-y-6 sm:space-y-8 animate-slide-up">
      
      <HeaderActions>
        <div className="hidden lg:flex items-center gap-2">
          <Button
            onClick={() => window.open(`/shop/${shop?.slug || shop.id}`, '_blank')}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 h-9 border-slate-200"
          >
            <ExternalLink size={16} />
            View Menu
          </Button>
          <Button
            onClick={() => navigate('/qr-code')}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 h-9 border-slate-200"
          >
            <QrCode size={16} />
            Get QR
          </Button>
        </div>
      </HeaderActions>

      {/* ── VERSION 2.0.5 SCHEMES LOG BANNER (CRACKERS & BAKERIES) ────────────────── */}
      {isSchemeShop && showSchemeBanner && (
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-[1px] shadow-xs">
          <div className="relative rounded-[7px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Coins size={18} className="animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    v2.1.2 MAJOR RELEASE
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                    <span>Customer Savings Schemes (Pandu) Live!</span>
                    <Coins size={14} className="text-amber-500" />
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                  Start festive installment clubs with automated WhatsApp due reminders and live customer passbooks.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setIsWhatsNewOpen(true)}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                What's New
              </button>
              <button
                type="button"
                onClick={() => navigate('/schemes')}
                className="px-3 py-1.5 rounded-md bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-medium shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
              >
                <span>Launch Schemes</span>
                <ArrowRight size={12} />
              </button>
              <button
                type="button"
                onClick={handleDismissSchemeBanner}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <WhatsNewModal
        isOpen={isWhatsNewOpen}
        onClose={() => setIsWhatsNewOpen(false)}
        forceOpen={isWhatsNewOpen}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {statCards.map((stat, i) => (
          <StatSummaryCard
            key={i}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            colorClass={stat.color}
            bgClass={stat.bg}
          />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Recent Activity */}
        <Card className="flex flex-col h-[320px] sm:h-[400px]">
          <CardHeader className="shrink-0 pb-2 sm:pb-3 space-y-2">
            <div>
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input 
                placeholder="Search activity..."
                className="pl-8 bg-slate-50 dark:bg-slate-900 h-8 text-xs"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
              />
              {isSearchingActivity && (
                <div className="absolute right-2.5 top-2 h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-0.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-md text-slate-500 shrink-0">
                      <Clock size={13} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {activity.details ||
                          activity.action.replace('_', ' ')}
                      </p>

                      <p className="text-[10.5px] text-slate-400">
                        {formatLocalDateTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No recent activity found.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Reviews */}
        <Card className="flex flex-col h-[300px] sm:h-[400px] lg:col-span-2">
          <CardHeader className="shrink-0 pb-2 sm:pb-3">
            <CardTitle>Top Product Reviews</CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
            {topReviews.length > 0 ? (
              <div className="space-y-2.5">
                {topReviews.map((review: any) => (
                  <div key={review.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-md border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate pr-2">
                        {review.item_name}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.2 rounded-md text-orange-600 dark:text-orange-400">
                        <Star size={11} className="fill-current" />
                        <span className="text-[10px] font-bold">{review.rating}</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-2 mb-1">
                        "{review.comment}"
                      </p>
                    )}
                    <div className="flex justify-between items-center text-[9.5px] text-slate-400">
                      <span className="font-medium">{review.reviewer_name}</span>
                      <span>{formatLocalDate(review.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <Star size={24} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs">No reviews yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

    {/* FIXED FAB USING CREATEPORTAL */}
    {!isCreateOrderModalOpen && createPortal(
      <div className="fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-50 flex flex-col items-end gap-3">
        {/* Expanded Actions */}
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-300 ${
            isFabOpen
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-2.5 py-1 rounded-md shadow-xs text-xs font-medium border border-slate-200/80 dark:border-slate-700">
              Create Order
            </span>

            <button
              onClick={() => {
                setIsFabOpen(false);
                setIsCreateOrderModalOpen(true);
              }}
              className="w-11 h-11 rounded-xl bg-primary text-white shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <ShoppingBag size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-2.5 py-1 rounded-md shadow-xs text-xs font-medium border border-slate-200/80 dark:border-slate-700">
              View Menu
            </span>

            <button
              onClick={() => {
                setIsFabOpen(false);
                window.open(`/shop/${shop?.slug || shop?.id}`, '_blank');
              }}
              className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <ExternalLink size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-2.5 py-1 rounded-md shadow-xs text-xs font-medium border border-slate-200/80 dark:border-slate-700">
              Get QR Code
            </span>

            <button
              onClick={() => {
                setIsFabOpen(false);
                navigate('/qr-code');
              }}
              className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <QrCode size={20} />
            </button>
          </div>
        </div>

        {/* Main Square FAB */}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl shadow-xl flex items-center justify-center text-white transition-all duration-200 cursor-pointer border border-white/20 active:scale-95 ${
            isFabOpen ? 'bg-slate-800 rotate-45' : 'bg-primary hover:bg-primary-600 hover:scale-105'
          }`}
          title={isFabOpen ? "Close menu" : "Quick actions"}
        >
          <Plus size={24} />
        </button>
      </div>,
      document.body
    )}

    {/* Create Order Modal */}
    <CreateOrderModal
      isOpen={isCreateOrderModalOpen}
      onClose={() => setIsCreateOrderModalOpen(false)}
      onOrderCreated={() => navigate('/orders')}
    />
  </PageContainer>
  );
}

// Needed because we reference Store icon before it was imported in DashboardPage
import { Store } from 'lucide-react';
