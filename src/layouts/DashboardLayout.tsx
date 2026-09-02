import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
import Lenis from 'lenis';
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
  Sparkles,
  Wallet,
  ArrowRight,
  Lock,
  LogOut,
  Shield,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  TrendingUp,
  Layers,
  Megaphone,
  Sliders
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useShopStore } from '@/store/shopStore';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { triggerHaptic, HAPTIC_PATTERNS } from '@/utils/haptic';
import { LanguageSelectorModal } from '@/components/LanguageSelectorModal';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { api } from '@/services/api';
import logo from "@/assets/menukit-logo.svg";
import { ShopSwitcherDropdown } from '@/components/ShopSwitcherDropdown';

export function DashboardLayout() {
  const navigate = useNavigate();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);
  const headerTitle = useHeaderStore((state) => state.title);
  const headerSubtitle = useHeaderStore((state) => state.subtitle);
  const { user, logout } = useAuthStore();
  const { shop, setShop } = useShopStore();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fetchCurrentShop = async () => {
      try {
        const res = await api.get('/shops/me');
        setShop(res.data);
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
    const fetchSub = async () => {
      try {
        const res = await api.get('/subscription/current');
        setSubStatus(res.data);
      } catch (e) {
        console.error('Failed to fetch subscription in layout', e);
      }
    };
    fetchSub();
  }, []);

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
      '/subscription': {
        icon: 'text-purple-500 dark:text-purple-400',
        bg: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50',
        border: 'border-purple-200/80 dark:border-purple-800/50',
        text: 'text-purple-950 dark:text-purple-200 font-semibold'
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
      ]
    },
    {
      section: 'Marketing & Growth',
      items: [
        { name: 'Campaigns', path: '/campaigns', icon: Megaphone, iconColor: 'text-purple-500', permissionModule: 'marketing' },
        { name: 'Members', path: '/members', icon: Users, iconColor: 'text-teal-500', permissionModule: 'customers' },
        { name: 'Discounts', path: '/discounts', icon: Tag, iconColor: 'text-rose-500', permissionModule: 'discounts' },
        { name: 'Contests', path: '/contests', icon: Trophy, iconColor: 'text-yellow-500', permissionModule: 'contests' },
        { name: 'QR Code', path: '/qr-code', icon: QrCode, iconColor: 'text-indigo-500' },
      ]
    },

    {
      section: 'Management & System',
      items: [
        { name: 'Shop', path: '/shop-setup', icon: Store, iconColor: 'text-orange-500', permissionModule: 'settings' },
        { name: 'Staff', path: '/settings/team', icon: Shield, iconColor: 'text-blue-600', permissionModule: 'team' },
        { name: 'Customize Theme', path: '/customize', icon: Palette, iconColor: 'text-pink-500', permissionModule: 'settings' },
        { name: 'Subscription', path: '/subscription', icon: Sparkles, iconColor: 'text-purple-500', permissionModule: 'subscription' },
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

    // Employee / Collaborator permission check
    const perms = shop.employee_permissions ? shop.employee_permissions[module] : undefined;
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
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 h-screen overflow-hidden">
        {/* Desktop Sidebar Top Header (Shop Switcher) */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <ShopSwitcherDropdown />
        </div>

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 p-3 space-y-2.5 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(item => hasPermission(item.permissionModule));
            if (visibleItems.length === 0) return null;

            const hasActiveChild = visibleItems.some(item =>
              item.path === '/settings' ? location.pathname === '/settings' : location.pathname.startsWith(item.path)
            );
            const isOpen = openSections[group.section] ?? true;
            const secTheme = getSectionTheme(group.section, hasActiveChild);
            const SecIcon = getSectionIcon(group.section);

            return (
              <div key={group.section} className="space-y-1">
                {/* Vibrant Folder Header Card */}
                <button
                  type="button"
                  onClick={() => toggleSection(group.section)}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-2xl border transition-all duration-200 group cursor-pointer select-none",
                    hasActiveChild
                      ? secTheme.activeHeader
                      : "border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", secTheme.iconBg)}>
                      <SecIcon size={14} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate">
                      {group.section}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors", secTheme.badge)}>
                      {visibleItems.length}
                    </span>
                    {isOpen ? (
                      <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform" />
                    )}
                  </div>
                </button>

                {/* Sub-items (Tree Node Branch Contents) */}
                {isOpen && (
                  <div className="pl-4 ml-3.5 space-y-1 my-1">
                    {visibleItems.map((item, idx) => {
                      const isLast = idx === visibleItems.length - 1;
                      const isActive = item.path === '/settings'
                        ? location.pathname === '/settings'
                        : location.pathname.startsWith(item.path);
                      const Icon = item.icon;
                      const theme = getItemTheme(item.path);

                      return (
                        <div key={item.path} className="relative flex items-center">
                          {/* Tree Line Connector Arms */}
                          <div className="absolute -left-3.5 top-0 bottom-0 w-3.5 pointer-events-none">
                            {/* Vertical stem */}
                            <div className="absolute left-0 top-0 w-0.5 h-1/2 bg-slate-200 dark:bg-slate-800" />
                            {!isLast && (
                              <div className="absolute left-0 top-1/2 w-0.5 h-1/2 bg-slate-200 dark:bg-slate-800" />
                            )}
                            {/* Horizontal branch arm */}
                            <div className="absolute left-0 top-1/2 w-3.5 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-r" />
                          </div>

                          <NavLink
                            to={item.path}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all ml-1",
                              isActive
                                ? "bg-primary text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                            )}
                          >
                            <Icon size={16} className={isActive ? "text-white" : (item.iconColor ?? theme.icon)} />
                            <span className="truncate">{item.name}</span>
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

        {/* Sidebar Footer - Logged in user info */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight" title={user?.email || ''}>
                {user?.email || 'Logged in user'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium capitalize leading-tight">
                {isOwner ? 'Shop Owner' : 'Collaborator'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSignOutModalOpen(true)}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* DESKTOP Top Bar Header */}
        <div className="hidden lg:flex h-16 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 items-center justify-between shrink-0 z-30">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight font-heading">{headerTitle}</h1>
            {headerSubtitle && <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{headerSubtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div id="header-actions-portal" className="flex items-center gap-3"></div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={() => setIsLanguageModalOpen(true)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Change Language"
              >
                <Languages size={15} />
              </button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

              {/* Top Bar Sign Out */}
              <button
                onClick={() => setIsSignOutModalOpen(true)}
                className="w-8 h-8 ml-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors"
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* FIXED Mobile Header Bar */}
        <div className="lg:hidden h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 flex items-center justify-between shrink-0 z-30 relative">
          {/* Shop Switcher Dropdown on Mobile */}
          <div className="flex items-center gap-2 min-w-0 max-w-[65%] z-20">
            <ShopSwitcherDropdown />
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0 z-20">
            <NotificationBell />
            <button
              onClick={() => setIsLanguageModalOpen(true)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Change Language"
            >
              <Languages size={16} />
            </button>
            <button
              onClick={() => setIsSignOutModalOpen(true)}
              className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* TOP APP BAR SUBSCRIPTION ALERT BANNER */}
        {subStatus && subStatus.is_expired && (
          <div
            onClick={() => navigate('/subscription')}
            className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2 text-xs font-black flex items-center justify-between cursor-pointer shadow-md hover:brightness-110 transition-all z-30 shrink-0"
            title="Click to open subscription renewal page"
          >
            <div className="flex items-center gap-2">
              <span className="animate-pulse text-base">🚨</span>
              <span>Your subscription has ended. Please renew to restore full feature access.</span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-lg hover:bg-white/30 transition-colors uppercase tracking-wider text-[10px] font-black shrink-0">
              <span>Renew Subscription</span>
              <ArrowRight size={12} />
            </div>
          </div>
        )}

        {subStatus && !subStatus.is_expired && subStatus.is_grace_period && (
          <div
            onClick={() => navigate('/subscription')}
            className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-2 text-xs font-black flex items-center justify-between cursor-pointer shadow-md hover:brightness-110 transition-all z-30 shrink-0"
            title="Click to open subscription renewal page"
          >
            <div className="flex items-center gap-2">
              <span className="animate-bounce text-base">⚠️</span>
              <span>Subscription Ended: Grace Period Active ({subStatus.grace_days_left} day{subStatus.grace_days_left !== 1 ? 's' : ''} left). Please renew now.</span>
            </div>
            <div className="flex items-center gap-1 bg-black/20 px-2.5 py-1 rounded-lg hover:bg-black/30 transition-colors uppercase tracking-wider text-[10px] font-black shrink-0">
              <span>Renew Now</span>
              <ArrowRight size={12} />
            </div>
          </div>
        )}

        {subStatus && !subStatus.is_expired && !subStatus.is_grace_period && subStatus.days_left <= 3 && (
          <div
            onClick={() => navigate('/subscription')}
            className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-1.5 text-[11px] font-bold flex items-center justify-between cursor-pointer shadow-sm hover:brightness-110 transition-all z-30 shrink-0"
            title="Click to view subscription plans"
          >
            <div className="flex items-center gap-1.5">
              <span>⏳ <strong>{subStatus.is_trial ? 'Free Trial Ending Soon' : 'Subscription Ending Soon'}:</strong> Only {subStatus.days_left} day{subStatus.days_left !== 1 ? 's' : ''} remaining. Renew now to avoid interruption.</span>
            </div>
            <span className="underline text-[10px] font-black uppercase tracking-wider shrink-0">Renew Plan →</span>
          </div>
        )}

        {/* Scrollable Main Content View */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 relative"
          onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 20)}
        >
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* FIXED Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40 flex justify-around items-center px-1 safe-area-bottom shadow-lg">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          const theme = getItemTheme(item.path, item.iconColor);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => triggerHaptic(HAPTIC_PATTERNS.tap)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all",
                isActive ? "font-bold scale-105" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Icon size={20} className={isActive ? theme.icon : "text-slate-500 dark:text-slate-400"} />
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
              <h4 className="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-2.5">
                {group.section}
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  const theme = getItemTheme(item.path);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        triggerHaptic(HAPTIC_PATTERNS.tap);
                        setIsMoreMenuOpen(false);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-1.5 shadow-2xs",
                        theme.bg,
                        theme.border,
                        isActive && "ring-2 ring-primary ring-offset-1 font-black"
                      )}
                    >
                      <Icon size={22} className={theme.icon} />
                      <span className={cn("text-[11px] font-bold truncate w-full", theme.text)}>
                        {item.name}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Mobile Sign Out Button */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setIsMoreMenuOpen(false);
                setIsSignOutModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-100 dark:border-rose-900/50 transition-colors shadow-2xs cursor-pointer"
            >
              <LogOut size={16} />
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
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to sign out of your Menukit account?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsSignOutModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsSignOutModalOpen(false);
                logout();
              }}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors shadow-xs"
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
    </div>
  );
}
