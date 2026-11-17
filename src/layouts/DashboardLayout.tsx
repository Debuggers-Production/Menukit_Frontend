import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import Lenis from 'lenis';
import { DashboardRouteLoading } from '@/components/DashboardRouteLoading';
import { preloadRoute, preloadAllRoutes } from '@/utils/lazyWithPreload';
import {
  LayoutDashboard,
  Store,
  MenuSquare,
  Coffee,
  Palette,
  QrCode,
  LineChart,
  Languages,
  Settings as SettingsIcon,
  Tag,
  Users,
  ShoppingBag,
  Trophy,
  MoreHorizontal,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
  Wallet,
  ArrowRight,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Lock,
  LogOut,
  Shield,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Folder,
  FolderOpen,
  TrendingUp,
  Layers,
  Megaphone,
  Sliders,
  Laptop,
  Download,
  PenTool,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
  Bell,
  Coins
} from 'lucide-react';
import { isSchemeEnabledShop } from '@/config/businessCategories';
import { useAuthStore } from '@/store/authStore';
import { useShopStore } from '@/store/shopStore';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { triggerHaptic, HAPTIC_PATTERNS } from '@/utils/haptic';
import { LanguageSelectorModal } from '@/components/LanguageSelectorModal';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { WsConnectionTracker } from '@/components/common/WsConnectionTracker';
import { api } from '@/services/api';
import logo from "@/assets/menukit-logo.svg";
import { ShopSwitcherDropdown } from '@/components/ShopSwitcherDropdown';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { DesktopInstallModal } from '@/components/DesktopInstallModal';
import { WhatsNewModal } from '@/components/WhatsNewModal';
import { NotificationTopBanner } from '@/components/NotificationPermissionAlert';
import { useSubscriptionStore, isModuleActive } from '@/store/subscriptionStore';

export function DashboardLayout() {
  const navigate = useNavigate();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('menukit_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const { isInstalled, promptInstall, isModalOpen, setIsModalOpen } = usePWAInstall();
  const { subscriptionStatus: subStatus, fetchSubscription } = useSubscriptionStore();
  const headerTitle = useHeaderStore((state) => state.title);
  const headerSubtitle = useHeaderStore((state) => state.subtitle);
  const { user, logout } = useAuthStore();
  const { shop, setShop } = useShopStore();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const isSubscriptionExpired = useMemo(() => {
    if (!subStatus) return false;
    if (subStatus.is_expired) return true;
    const validExpired = (subStatus.expired_modules || []).filter(
      (m: string) => m !== 'new-member' && m !== 'analytics-advanced-filters' && m !== 'analytics-customer-insights'
    );
    if (subStatus.has_expired_modules && validExpired.length > 0) {
      return true;
    }
    if (subStatus.days_left === 0 && !subStatus.is_active) {
      return true;
    }
    return false;
  }, [subStatus]);

  const genuineExpiredCount = useMemo(() => {
    if (!subStatus) return 0;
    const validExpired = (subStatus.expired_modules || []).filter(
      (m: string) => m !== 'new-member' && m !== 'analytics-advanced-filters' && m !== 'analytics-customer-insights'
    );
    return validExpired.length || subStatus.expired_modules_count || 1;
  }, [subStatus]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('menukit_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Fast route titles for instant header synchronization on click
  const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
    '/dashboard': { title: 'Dashboard', subtitle: '' },
    '/campaigns': { title: 'Campaigns', subtitle: '' },
    '/contests': { title: 'Contests Manager', subtitle: '' },
    '/orders': { title: 'Orders', subtitle: '' },
    '/categories': { title: 'Categories', subtitle: '' },
    '/menu-items': { title: 'Menus', subtitle: '' },
    '/schemes': { title: '', subtitle: '' },
    '/discounts': { title: 'Discounts', subtitle: '' },
    '/members': { title: 'Members', subtitle: '' },
    '/qr-code': { title: 'QR Code', subtitle: '' },
    '/analytics': { title: 'Analytics', subtitle: '' },
    '/customize': { title: 'Customize Theme', subtitle: '' },
    '/chalkboard': { title: 'Chalkboard Sign', subtitle: '' },
    '/shop-setup': { title: 'Shop Settings', subtitle: '' },
    '/settings/team': { title: 'Staff & Team', subtitle: '' },
    '/subscription': { title: 'Plans & Subscriptions', subtitle: '' },
    '/settlements': { title: 'Settlements', subtitle: '' },
    '/settings': { title: 'Settings', subtitle: '' },
    '/notifications': { title: 'Notifications', subtitle: '' },
    '/internal-bulk': { title: 'Bulk Data Upload', subtitle: '' },
  };

  // Immediate title synchronization on route change so previous page title doesn't linger
  useEffect(() => {
    const meta = ROUTE_META[location.pathname] || Object.entries(ROUTE_META).find(([p]) => location.pathname.startsWith(p))?.[1];
    if (meta) {
      useHeaderStore.getState().setTitle(meta.title, meta.subtitle);
    }
  }, [location.pathname]);

  // Preload all dashboard page chunks in the background during idle time
  useEffect(() => {
    const timer = setTimeout(() => {
      preloadAllRoutes();
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchCurrentShop = async () => {
      try {
        const res = await api.get('/shops/me');
        if (res.data?.id) {
          setShop(res.data);
          localStorage.setItem('current_shop_id', res.data.id);
        } else {
          // Fallback if /shops/me had no matching shop
          const myShopsRes = await api.get('/shops/my-shops');
          const allShops = [...(myShopsRes.data?.owned || []), ...(myShopsRes.data?.employed || [])];
          if (allShops.length > 0) {
            const firstShop = allShops[0];
            const targetId = firstShop.id || firstShop.shop?.id;
            if (targetId) {
              localStorage.setItem('current_shop_id', targetId);
              const freshShopRes = await api.get('/shops/me', { headers: { 'X-Shop-Id': targetId } });
              if (freshShopRes.data?.id) {
                setShop(freshShopRes.data);
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch current shop in DashboardLayout', e);
      }
    };
    fetchCurrentShop();
  }, [setShop]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Overview': true,
    'Core Operations': true,
    'Marketing & Growth': true,
    'Management & System': true,
  });

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  useWebSocket();

  // Auto-register / refresh FCM device token for shop notifications if permission already granted
  useEffect(() => {
    if (!shop?.id) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      import('@/services/fcm').then(({ requestFCMToken }) => {
        requestFCMToken(shop.id).catch((err) => {
          console.debug('[FCM] Auto-sync token notice:', err);
        });
      });
    }
  }, [shop?.id]);

  // Listen for FCM push notifications across all pages of the merchant portal
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    import('@/services/fcm').then(({ setupFCMForegroundListener }) => {
      cleanup = setupFCMForegroundListener();
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  useEffect(() => {
    if (!mainRef.current) return;

    // The wrapper is the container that has overflow-y-auto and a fixed height
    // The content is the inner wrapper that gets scrolled
    const lenis = new Lenis({
      wrapper: mainRef.current,
      content: mainRef.current.firstElementChild as HTMLElement || mainRef.current,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  interface NavItem {
    name: string;
    path: string;
    icon: any;
    iconColor?: string;
    disabled?: boolean;
    label?: string;
    permissionModule?: string;
  }

  interface NavGroup {
    section: string;
    items: NavItem[];
  }

  const getItemTheme = (path: string, customIconColor?: string) => {
    const themeMap: Record<string, { icon: string; bg: string; border: string; text: string }> = {
      '/dashboard': {
        icon: 'text-violet-500 dark:text-violet-400',
        bg: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50',
        border: 'border-violet-200/80 dark:border-violet-800/50',
        text: 'text-violet-950 dark:text-violet-200 font-semibold'
      },
      '/analytics': {
        icon: 'text-blue-500 dark:text-blue-400',
        bg: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50',
        border: 'border-blue-200/80 dark:border-blue-800/50',
        text: 'text-blue-950 dark:text-blue-200 font-semibold'
      },
      '/orders': {
        icon: 'text-emerald-500 dark:text-emerald-400',
        bg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50',
        border: 'border-emerald-200/80 dark:border-emerald-800/50',
        text: 'text-emerald-950 dark:text-emerald-200 font-semibold'
      },
      '/categories': {
        icon: 'text-cyan-500 dark:text-cyan-400',
        bg: 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50',
        border: 'border-cyan-200/80 dark:border-cyan-800/50',
        text: 'text-cyan-950 dark:text-cyan-200 font-semibold'
      },
      '/menu-items': {
        icon: 'text-amber-500 dark:text-amber-400',
        bg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50',
        border: 'border-amber-200/80 dark:border-amber-800/50',
        text: 'text-amber-950 dark:text-amber-200 font-semibold'
      },
      '/schemes': {
        icon: 'text-amber-500 dark:text-amber-400',
        bg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50',
        border: 'border-amber-200/80 dark:border-amber-800/50',
        text: 'text-amber-950 dark:text-amber-200 font-semibold'
      },
      '/campaigns': {
        icon: 'text-purple-500 dark:text-purple-400',
        bg: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50',
        border: 'border-purple-200/80 dark:border-purple-800/50',
        text: 'text-purple-950 dark:text-purple-200 font-semibold'
      },
      '/discounts': {
        icon: 'text-rose-500 dark:text-rose-400',

        bg: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50',
        border: 'border-rose-200/80 dark:border-rose-800/50',
        text: 'text-rose-950 dark:text-rose-200 font-semibold'
      },
      '/contests': {
        icon: 'text-yellow-500 dark:text-yellow-400',
        bg: 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:hover:bg-yellow-900/50',
        border: 'border-yellow-200/80 dark:border-yellow-800/50',
        text: 'text-yellow-950 dark:text-yellow-200 font-semibold'
      },
      '/qr-code': {
        icon: 'text-indigo-500 dark:text-indigo-400',
        bg: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50',
        border: 'border-indigo-200/80 dark:border-indigo-800/50',
        text: 'text-indigo-950 dark:text-indigo-200 font-semibold'
      },
      '/shop-setup': {
        icon: 'text-orange-500 dark:text-orange-400',
        bg: 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/50',
        border: 'border-orange-200/80 dark:border-orange-800/50',
        text: 'text-orange-950 dark:text-orange-200 font-semibold'
      },
      '/members': {
        icon: 'text-teal-500 dark:text-teal-400',
        bg: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50',
        border: 'border-teal-200/80 dark:border-teal-800/50',
        text: 'text-teal-950 dark:text-teal-200 font-semibold'
      },
      '/settings/team': {
        icon: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50',
        border: 'border-blue-200/80 dark:border-blue-800/50',
        text: 'text-blue-950 dark:text-blue-200 font-semibold'
      },
      '/customize': {
        icon: 'text-pink-500 dark:text-pink-400',
        bg: 'bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/50',
        border: 'border-pink-200/80 dark:border-pink-800/50',
        text: 'text-pink-950 dark:text-pink-200 font-semibold'
      },
      '/chalkboard': {
        icon: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50',
        border: 'border-amber-200/80 dark:border-amber-800/50',
        text: 'text-amber-950 dark:text-amber-200 font-semibold'
      },
      '/subscription': {
        icon: 'text-orange-500 dark:text-orange-400',
        bg: 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/50',
        border: 'border-orange-200/80 dark:border-orange-800/50',
        text: 'text-orange-950 dark:text-orange-200 font-semibold'
      },
      '/settlements': {
        icon: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-900/50',
        border: 'border-green-200/80 dark:border-green-800/50',
        text: 'text-green-950 dark:text-green-200 font-semibold'
      },
      '/settings': {
        icon: 'text-slate-500 dark:text-slate-400',
        bg: 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/60',
        border: 'border-slate-200/80 dark:border-slate-700/50',
        text: 'text-slate-800 dark:text-slate-200 font-semibold'
      }
    };

    return themeMap[path] || {
      icon: customIconColor || 'text-primary',
      bg: 'bg-primary/10 hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/30',
      border: 'border-primary/20 dark:border-primary/40',
      text: 'text-foreground font-semibold'
    };
  };

  const getPageDetails = () => {
    const path = location.pathname;

    if (path.startsWith('/dashboard')) {
      return { icon: LayoutDashboard, iconColor: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200/80 dark:border-violet-800/50' };
    }
    if (path.startsWith('/analytics')) {
      return { icon: LineChart, iconColor: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/50' };
    }
    if (path.startsWith('/orders')) {
      return { icon: ShoppingBag, iconColor: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/50' };
    }
    if (path.startsWith('/categories')) {
      return { icon: MenuSquare, iconColor: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-800/50' };
    }
    if (path.startsWith('/menu-items')) {
      return { icon: Coffee, iconColor: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/50' };
    }
    if (path.startsWith('/schemes')) {
      return { icon: Coins, iconColor: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/50' };
    }
    if (path.startsWith('/campaigns')) {
      return { icon: Megaphone, iconColor: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-800/50' };
    }
    if (path.startsWith('/members')) {
      return { icon: Users, iconColor: 'text-teal-500 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200/80 dark:border-teal-800/50' };
    }
    if (path.startsWith('/discounts')) {
      return { icon: Tag, iconColor: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/50' };
    }
    if (path.startsWith('/contests')) {
      return { icon: Trophy, iconColor: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200/80 dark:border-yellow-800/50' };
    }
    if (path.startsWith('/chalkboard')) {
      return { icon: PenTool, iconColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/50' };
    }
    if (path.startsWith('/qr-code')) {
      return { icon: QrCode, iconColor: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-800/50' };
    }
    if (path.startsWith('/shop-setup')) {
      return { icon: Store, iconColor: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200/80 dark:border-orange-800/50' };
    }
    if (path.startsWith('/settings/team')) {
      return { icon: Shield, iconColor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/50' };
    }
    if (path.startsWith('/customize')) {
      return { icon: Palette, iconColor: 'text-pink-500 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/40 border-pink-200/80 dark:border-pink-800/50' };
    }
    if (path.startsWith('/subscription')) {
      return { icon: Zap, iconColor: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200/80 dark:border-orange-800/50' };
    }
    if (path.startsWith('/settlements')) {
      return { icon: Wallet, iconColor: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40 border-green-200/80 dark:border-green-800/50' };
    }
    if (path.startsWith('/settings')) {
      return { icon: SettingsIcon, iconColor: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60' };
    }
    if (path.startsWith('/notifications')) {
      return { icon: Bell, iconColor: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-800/50' };
    }
    if (path.startsWith('/bulk-upload') || path.startsWith('/json-bulk-upload') || path.startsWith('/internal-bulk')) {
      return { icon: FileSpreadsheet, iconColor: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/50' };
    }
    if (path.startsWith('/terms') || path.startsWith('/privacy') || path.startsWith('/refund')) {
      return { icon: ShieldCheck, iconColor: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60' };
    }

    return { icon: Store, iconColor: 'text-primary', bg: 'bg-primary/10 border-primary/20' };
  };

  const navGroups: NavGroup[] = [
    {
      section: 'Sales & Revenue',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, iconColor: 'text-violet-500' },
        { name: 'Analytics', path: '/analytics', icon: LineChart, iconColor: 'text-blue-500', permissionModule: 'analytics' },
      ]
    },
    {
      section: 'Core Operations',
      items: [
        { name: 'Orders', path: '/orders', icon: ShoppingBag, iconColor: 'text-emerald-500', permissionModule: 'orders' },
        { name: 'Categories', path: '/categories', icon: MenuSquare, iconColor: 'text-cyan-500', permissionModule: 'menu_categories' },
        { name: 'Menus', path: '/menu-items', icon: Coffee, iconColor: 'text-amber-500', permissionModule: 'menu_items' },
        ...(isSchemeEnabledShop(shop?.category, shop?.settings) ? [
          { name: 'Schemes', path: '/schemes', icon: Coins, iconColor: 'text-amber-500', permissionModule: 'schemes' }
        ] : []),
      ]
    },
    {
      section: 'Marketing & Growth',
      items: [
        { name: 'Campaigns', path: '/campaigns', icon: Megaphone, iconColor: 'text-purple-500', permissionModule: 'campaigns' },
        { name: 'Members', path: '/members', icon: Users, iconColor: 'text-teal-500', permissionModule: 'customers' },
        { name: 'Discounts', path: '/discounts', icon: Tag, iconColor: 'text-rose-500', permissionModule: 'discounts' },
        { name: 'Contests', path: '/contests', icon: Trophy, iconColor: 'text-yellow-500', permissionModule: 'contests' },
        { name: 'Chalkboard', path: '/chalkboard', icon: PenTool, iconColor: 'text-amber-500', permissionModule: 'chalkboard' },
        { name: 'QR Code', path: '/qr-code', icon: QrCode, iconColor: 'text-indigo-500' },
      ]
    },

    {
      section: 'Management & System',
      items: [
        { name: 'Shop', path: '/shop-setup', icon: Store, iconColor: 'text-orange-500', permissionModule: 'settings' },
        { name: 'Staff', path: '/settings/team', icon: Shield, iconColor: 'text-blue-600', permissionModule: 'team' },
        { name: 'Customize Theme', path: '/customize', icon: Palette, iconColor: 'text-pink-500', permissionModule: 'theme' },
        { name: 'Subscription', path: '/subscription', icon: Zap, iconColor: 'text-orange-500' },
        { name: 'Settlements', path: '/settlements', icon: Wallet, iconColor: 'text-green-600', permissionModule: 'settlements' },
        { name: 'Settings', path: '/settings', icon: SettingsIcon, iconColor: 'text-slate-500', permissionModule: 'settings' },
      ]
    }
  ];

  const isOwner = Boolean(
    shop && user && (
      (shop.user_id && String(shop.user_id) === String(user.id)) ||
      !shop.employee_permissions
    )
  );

  const hasPermission = (module?: string) => {
    if (!module) return true;
    if (isOwner) return true; // Owner has all permissions
    if (!shop) return false;

    // Employee / Collaborator permission check with aliases
    let perms = shop.employee_permissions ? shop.employee_permissions[module] : undefined;
    if (!perms && (module === 'campaigns' || module === 'marketing')) {
      perms = shop.employee_permissions ? (shop.employee_permissions['campaigns'] || shop.employee_permissions['marketing']) : undefined;
    }
    if (!perms && (module === 'theme' || module === 'customize')) {
      perms = shop.employee_permissions ? (shop.employee_permissions['theme'] || shop.employee_permissions['settings']) : undefined;
    }
    if (!perms && module === 'chalkboard') {
      perms = shop.employee_permissions ? (shop.employee_permissions['chalkboard'] || shop.employee_permissions['settings']) : undefined;
    }
    if (!perms && module === 'schemes') {
      perms = shop.employee_permissions ? (shop.employee_permissions['schemes'] || shop.employee_permissions['orders'] || shop.employee_permissions['settings']) : undefined;
    }
    return Boolean(perms && (perms.includes('read') || perms.includes('write')));
  };

  const mobileNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', path: '/orders', icon: ShoppingBag, permissionModule: 'orders' },
    { name: 'Categories', path: '/categories', icon: MenuSquare, permissionModule: 'menu_categories' },
    { name: 'Menus', path: '/menu-items', icon: Coffee, permissionModule: 'menu_items' },
  ].filter(item => hasPermission(item.permissionModule));

  const getSectionTheme = (section: string, hasActiveChild: boolean) => {
    switch (section) {
      case 'Sales & Revenue':
      case 'Sales & Growth':
      case 'Overview':
        return {
          iconBg: hasActiveChild ? 'bg-violet-500 text-white shadow-xs' : 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400',
          activeHeader: 'bg-violet-500/10 border-violet-500/30 text-violet-950 dark:text-violet-200 shadow-2xs',
          badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300'
        };
      case 'Core Operations':
        return {
          iconBg: hasActiveChild ? 'bg-emerald-500 text-white shadow-xs' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
          activeHeader: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200 shadow-2xs',
          badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
        };
      case 'Marketing & Growth':
        return {
          iconBg: hasActiveChild ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
          activeHeader: 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200 shadow-2xs',
          badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
        };
      case 'Management & System':
        return {
          iconBg: hasActiveChild ? 'bg-indigo-500 text-white shadow-xs' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
          activeHeader: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-950 dark:text-indigo-200 shadow-2xs',
          badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
        };
      default:
        return {
          iconBg: hasActiveChild ? 'bg-primary text-white shadow-xs' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
          activeHeader: 'bg-primary/10 border-primary/30 text-slate-900 dark:text-white shadow-2xs',
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        };
    }
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'Sales & Revenue':
      case 'Sales & Growth':
      case 'Overview':
        return TrendingUp;
      case 'Core Operations':
        return Layers;
      case 'Marketing & Growth':
        return Megaphone;
      case 'Management & System':
        return Sliders;
      default:
        return Folder;
    }
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 h-screen transition-all duration-300 ease-in-out select-none relative z-30",
        isSidebarCollapsed ? "w-16" : "w-64"
      )}>
        {/* Border Adjust Controller - Floating collapse handle without blocking scrollbar */}
        <div 
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-40 pointer-events-none select-none"
        >
          <button
            id="sidebar-collapse-toggle-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleSidebar();
            }}
            title={isSidebarCollapsed ? "Click to expand sidebar" : "Click to collapse sidebar"}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="pointer-events-auto w-4 h-9 rounded-r-md bg-white dark:bg-slate-900 border border-l-0 border-slate-300 dark:border-slate-700 shadow-xs text-slate-400 hover:text-primary hover:border-primary dark:hover:border-primary flex items-center justify-center transition-all cursor-pointer hover:w-5 group"
          >
            {isSidebarCollapsed ? <ChevronRight size={10} strokeWidth={2.5} /> : <ChevronLeft size={10} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Desktop Sidebar Top Header (Shop Switcher) */}
        <div className={cn(
          "h-14 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center",
          isSidebarCollapsed ? "px-2 justify-center" : "px-3 justify-between"
        )}>
          <div className={cn("min-w-0", isSidebarCollapsed ? "w-full flex justify-center" : "flex-1")}>
            <ShopSwitcherDropdown collapsed={isSidebarCollapsed} />
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <nav className={cn("flex-1 overflow-y-auto custom-scrollbar", isSidebarCollapsed ? "p-1.5 space-y-1.5" : "p-2.5 space-y-2")}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(item => hasPermission(item.permissionModule));
            if (visibleItems.length === 0) return null;

            const hasActiveChild = visibleItems.some(item =>
              item.path === '/settings' ? location.pathname === '/settings' : location.pathname.startsWith(item.path)
            );
            const isOpen = openSections[group.section] ?? true;
            const secTheme = getSectionTheme(group.section, hasActiveChild);
            const SecIcon = getSectionIcon(group.section);

            if (isSidebarCollapsed) {
              return (
                <div key={group.section} className="space-y-1 py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                  {visibleItems.map((item) => {
                    const isActive = item.path === '/settings'
                      ? location.pathname === '/settings'
                      : location.pathname.startsWith(item.path);
                    const Icon = item.icon;
                    const theme = getItemTheme(item.path);
                    const isLocked = item.path === '/subscription' ? false : (subStatus && item.permissionModule ? !isModuleActive(subStatus, item.permissionModule) : false);

                    return (
                      <NavLink
                        key={item.path}
                        id={item.path === '/schemes' ? 'sidebar-nav-schemes' : item.path === '/subscription' ? 'sidebar-nav-subscription' : item.path === '/chalkboard' ? 'sidebar-nav-chalkboard' : undefined}
                        to={item.path}
                        onMouseEnter={() => preloadRoute(item.path)}
                        onFocus={() => preloadRoute(item.path)}
                        onTouchStart={() => preloadRoute(item.path)}
                        title={`${item.name} (${group.section})${isLocked ? ' - Locked (Expired)' : ''}`}
                        className={cn(
                          "w-9 h-9 mx-auto flex items-center justify-center rounded-md transition-all relative group",
                          isActive
                            ? "bg-primary text-white shadow-2xs"
                            : isLocked
                              ? "text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        <Icon size={16} className={isActive ? "text-white" : (item.iconColor ?? theme.icon)} />
                        {isLocked && (
                          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[7.5px] shadow-xs">
                            <Lock size={7} />
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={group.section} className="space-y-0.5">
                {/* Structured Group Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(group.section)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-md border transition-all duration-150 group cursor-pointer select-none",
                    hasActiveChild
                      ? secTheme.activeHeader
                      : "border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={cn("w-5.5 h-5.5 rounded-md flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", secTheme.iconBg)}>
                      <SecIcon size={13} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
                      {group.section}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <span className={cn("text-[9.5px] font-semibold px-1.5 py-0.2 rounded-md transition-colors", secTheme.badge)}>
                      {visibleItems.length}
                    </span>
                    {isOpen ? (
                      <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform" />
                    ) : (
                      <ChevronRight size={13} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform" />
                    )}
                  </div>
                </button>

                {/* Sub-items (Tree Node Branch Contents) */}
                {isOpen && (
                  <div className="pl-3.5 ml-2.5 space-y-0.5 my-0.5">
                    {visibleItems.map((item, idx) => {
                      const isLast = idx === visibleItems.length - 1;
                      const isActive = item.path === '/settings'
                        ? location.pathname === '/settings'
                        : location.pathname.startsWith(item.path);
                      const Icon = item.icon;
                      const theme = getItemTheme(item.path);
                      const isLocked = item.path === '/subscription' ? false : (subStatus && item.permissionModule ? !isModuleActive(subStatus, item.permissionModule) : false);

                      return (
                        <div key={item.path} className="relative flex items-center">
                          {/* Tree Line Connector Arms */}
                          <div className="absolute -left-3 top-0 bottom-0 w-3 pointer-events-none">
                            <div className="absolute left-0 top-0 w-0.5 h-1/2 bg-slate-200 dark:bg-slate-800" />
                            {!isLast && (
                              <div className="absolute left-0 top-1/2 w-0.5 h-1/2 bg-slate-200 dark:bg-slate-800" />
                            )}
                            <div className="absolute left-0 top-1/2 w-3 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-r" />
                          </div>

                          <NavLink id={item.path === '/schemes' ? 'sidebar-nav-schemes' : item.path === '/subscription' ? 'sidebar-nav-subscription' : item.path === '/chalkboard' ? 'sidebar-nav-chalkboard' : undefined} to={item.path}
                            onMouseEnter={() => preloadRoute(item.path)}
                            onFocus={() => preloadRoute(item.path)}
                            onTouchStart={() => preloadRoute(item.path)}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-semibold transition-all ml-0.5 group/navitem",
                              isActive
                                ? "bg-primary text-white font-bold shadow-2xs"
                                : isLocked
                                  ? "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200"
                                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-950 dark:hover:text-white"
                            )}
                          >
                            <Icon size={15} className={isActive ? "text-white" : (item.iconColor ?? theme.icon)} />
                            <span className="truncate flex-1 text-left">{item.name}</span>
                            {isLocked && (
                              <span className={cn(
                                "text-[9.5px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ml-auto transition-colors",
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              )}>
                                <Lock size={8.5} />
                                <span>Locked</span>
                              </span>
                            )}
                          </NavLink>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* PWA Desktop Web App Installation Banner in Sidebar */}
        {!isInstalled && (
          <div className={cn("border-t border-slate-100 dark:border-slate-800", isSidebarCollapsed ? "p-1.5 flex justify-center" : "p-2")}>
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={promptInstall}
                className="w-9 h-9 rounded-md bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-primary flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                title="Install Menukit Desktop App"
              >
                <Laptop size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={promptInstall}
                className="w-full p-2 rounded-md bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-left transition-all group cursor-pointer flex items-center justify-between shadow-2xs"
                title="Install Menukit Desktop Web App"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-primary text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Laptop size={12} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">Install Desktop App</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Faster POS & Printing</p>
                  </div>
                </div>
                <Download size={13} className="text-primary shrink-0 opacity-70 group-hover:opacity-100 transition-opacity ml-1" />
              </button>
            )}
          </div>
        )}

        {/* Sidebar Footer - Logged in user info */}
        <div className={cn(
          "border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 flex items-center",
          isSidebarCollapsed ? "p-2 flex-col gap-1.5 justify-center" : "p-2.5 justify-between gap-2"
        )}>
          <div className="flex items-center gap-2 min-w-0 flex-1" title={user?.email || ''}>
            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {user?.email || 'Logged in user'}
                </span>
                <span className="text-[10.5px] text-slate-400 dark:text-slate-500 font-medium capitalize leading-tight">
                  {isOwner ? 'Shop Owner' : 'Collaborator'}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSignOutModalOpen(true)}
            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors shrink-0 cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* DESKTOP Top Bar Header */}
        <div className="hidden lg:flex h-13 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-5 items-center justify-between gap-3 shrink-0 z-40 relative">
          {headerTitle && !location.pathname.startsWith('/schemes') ? (
            <div className="flex items-center gap-2.5 min-w-0 shrink-0 max-w-[200px] xl:max-w-[280px]">
              {/* Page Module Icon Badge matching Title */}
              {(() => {
                const page = getPageDetails();
                const PageIcon = page.icon;
                return (
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center border shrink-0 shadow-2xs transition-all",
                    page.bg
                  )}>
                    <PageIcon size={16} className={page.iconColor} />
                  </div>
                );
              })()}

              <div className="flex items-center min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight font-heading truncate" title={headerTitle}>{headerTitle}</h1>
              </div>
            </div>
          ) : null}
          <div className={cn(
            "flex items-center gap-2 sm:gap-3",
            location.pathname.startsWith('/schemes')
              ? "min-w-0 flex-1 justify-start"
              : "min-w-0 ml-auto justify-end"
          )}>
            <div
              id="header-actions-portal"
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 header-scrollbar-x py-1",
                location.pathname.startsWith('/schemes')
                  ? "min-w-0 flex-1 justify-start"
                  : "justify-end shrink-0"
              )}
            ></div>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isInstalled && (
                <button
                  onClick={promptInstall}
                  className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs border border-primary/25 transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer shrink-0 mr-1"
                  title="Install Menukit as Desktop App"
                >
                  <Laptop size={12} />
                  <span>Install Desktop App</span>
                </button>
              )}
              <WsConnectionTracker />
              <NotificationBell />

              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5"></div>

              {/* Top Bar Sign Out */}
              <button
                onClick={() => setIsSignOutModalOpen(true)}
                className="w-7 h-7 ml-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors shrink-0 cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* FIXED Mobile Header Bar */}
        <div className="lg:hidden h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 flex items-center justify-between shrink-0 z-40 relative">
          {/* Shop Switcher Dropdown on Mobile */}
          <div className="flex items-center gap-2 min-w-0 max-w-[65%] z-20">
            <ShopSwitcherDropdown />
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 shrink-0 z-20">
            {!isInstalled && (
              <button
                onClick={promptInstall}
                className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors border border-primary/25"
                title="Install Web App"
              >
                <Download size={14} />
              </button>
            )}
            <WsConnectionTracker />
            <NotificationBell directNavigate />
            <button
              onClick={() => setIsSignOutModalOpen(true)}
              className="w-7 h-7 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* TOP NOTIFICATION PERMISSION ALERT BANNER */}
        <NotificationTopBanner />

        {/* TOP APP BAR SUBSCRIPTION ALERT BANNER */}
        {subStatus && isSubscriptionExpired && (
          <div
            onClick={() => navigate('/subscription')}
            className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2 text-xs font-black flex items-center justify-between cursor-pointer shadow-md hover:brightness-110 transition-all z-30 shrink-0"
            title="Click to open subscription renewal page"
          >
            <div className="flex items-center gap-2">
              <AlertOctagon size={18} className="animate-pulse shrink-0 text-white" />
              <span>
                {subStatus.is_expired 
                  ? "Your subscription has ended. Features locked. Please renew to continue."
                  : `${genuineExpiredCount} add-on feature(s) have expired (0 days left). Features are locked. Please renew to restore full operations.`}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-lg hover:bg-white/30 transition-colors uppercase tracking-wider text-[10px] font-black shrink-0">
              <span>Renew Now</span>
              <ArrowRight size={12} />
            </div>
          </div>
        )}

        {subStatus && !isSubscriptionExpired && subStatus.days_left > 0 && subStatus.is_grace_period && (
          <div
            onClick={() => navigate('/subscription')}
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2 text-xs font-black flex items-center justify-between cursor-pointer shadow-md hover:brightness-110 transition-all z-30 shrink-0"
            title="Click to open subscription renewal page"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="animate-bounce shrink-0 text-white" />
              <span>
                <strong>{subStatus.is_trial ? 'Free Trial Ended' : 'Subscription Ended'}:</strong> Grace Period Active ({subStatus.grace_days_left} day{subStatus.grace_days_left !== 1 ? 's' : ''} left). Please renew now to prevent service interruption.
              </span>
            </div>
            <div className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg hover:bg-black/30 transition-colors uppercase tracking-wider text-[10px] font-black shrink-0">
              <span>Renew Now</span>
              <ArrowRight size={12} />
            </div>
          </div>
        )}

        {subStatus && !isSubscriptionExpired && !subStatus.is_grace_period && (subStatus.days_left > 0 && subStatus.days_left <= 5) && (
          <div
            onClick={() => navigate('/subscription')}
            className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2 text-xs font-bold flex items-center justify-between cursor-pointer shadow-md hover:brightness-110 transition-all z-30 shrink-0"
            title="Click to view subscription plans and renew"
          >
            <div className="flex items-center gap-2">
              <Clock size={18} className="animate-pulse shrink-0 text-white" />
              <span>
                <strong>{subStatus.is_trial ? 'Free Trial Ending Soon' : 'Subscription Ending Soon'}:</strong> Only {subStatus.core_days_left ?? subStatus.days_left} day{(subStatus.core_days_left ?? subStatus.days_left) !== 1 ? 's' : ''} remaining. Renew your plan to avoid losing operations & customer leads.
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-lg hover:bg-white/30 transition-colors uppercase tracking-wider text-[10px] font-black shrink-0">
              <span>Renew Plan</span>
              <ArrowRight size={12} />
            </div>
          </div>
        )}

        {/* Scrollable Main Content View */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5 pb-20 lg:pb-8 relative"
          onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 20)}
        >
          <div className="min-h-full">
            <Suspense fallback={<DashboardRouteLoading />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* FIXED Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40 flex justify-around items-center px-1 safe-area-bottom shadow-lg">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          const theme = getItemTheme(item.path, item.iconColor);
          const isLocked = item.path === '/subscription' ? false : (subStatus && item.permissionModule ? !isModuleActive(subStatus, item.permissionModule) : false);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onMouseEnter={() => preloadRoute(item.path)}
              onFocus={() => preloadRoute(item.path)}
              onTouchStart={() => preloadRoute(item.path)}
              onClick={() => triggerHaptic(HAPTIC_PATTERNS.tap)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all relative",
                isActive ? "font-bold scale-105" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="relative">
                <Icon size={20} className={isActive ? theme.icon : "text-slate-500 dark:text-slate-400"} />
                {isLocked && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 text-white rounded-full flex items-center justify-center text-[7px] shadow-xs">
                    <Lock size={6} />
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-bold", isActive ? theme.text : "text-slate-500 dark:text-slate-400")}>{item.name}</span>
            </NavLink>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => {
            triggerHaptic(HAPTIC_PATTERNS.tap);
            setIsMoreMenuOpen(true);
          }}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <MoreHorizontal size={20} className="text-slate-500 dark:text-slate-400" />
          <span className="text-[10px] font-bold">More</span>
        </button>
      </div>

      {/* COLORFUL Mobile More Features Sheet Modal */}
      <Modal
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        title="All Features & App Tools"
        className="max-w-md"
      >
        <div className="space-y-5 py-2">
          {navGroups.map((group) => (
            <div key={group.section}>
              <h4 className="text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-2.5">
                {group.section}
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  const theme = getItemTheme(item.path);
                  const isLocked = item.path === '/subscription' ? false : (subStatus && item.permissionModule ? !isModuleActive(subStatus, item.permissionModule) : false);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onMouseEnter={() => preloadRoute(item.path)}
                      onTouchStart={() => preloadRoute(item.path)}
                      onClick={() => {
                        triggerHaptic(HAPTIC_PATTERNS.tap);
                        setIsMoreMenuOpen(false);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-2.5 rounded-md border transition-all text-center gap-1 shadow-2xs relative",
                        theme.bg,
                        theme.border,
                        isActive && "ring-2 ring-primary ring-offset-1 font-bold",
                        isLocked && "opacity-80"
                      )}
                    >
                      {isLocked && (
                        <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[7px] shadow-xs">
                          <Lock size={7} />
                        </span>
                      )}
                      <Icon size={18} className={theme.icon} />
                      <span className={cn("text-xs font-semibold truncate w-full", theme.text)}>
                        {item.name}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Mobile Sign Out Button */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setIsMoreMenuOpen(false);
                setIsSignOutModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 transition-colors shadow-2xs cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        title="Sign Out Confirmation"
        className="max-w-xs"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to sign out of your <span className="font-semibold text-orange-600 dark:text-orange-500">Menukit</span> account?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsSignOutModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsSignOutModalOpen(false);
                logout();
              }}
              className="px-3.5 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors shadow-2xs cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </Modal>

      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
      />

      <DesktopInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onInstall={promptInstall}
      />

      <WhatsNewModal />
    </div>
  );
}



