import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router';
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
  Lock
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { LanguageSelectorModal } from '@/components/LanguageSelectorModal';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { api } from '@/services/api';
import logo from "@/assets/menukit-logo.svg";

export function DashboardLayout() {
  const navigate = useNavigate();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);
  const headerTitle = useHeaderStore((state) => state.title);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  useWebSocket();

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
  }, [location.pathname]);

  interface NavItem {
    name: string;
    path: string;
    icon: any;
    disabled?: boolean;
    label?: string;
  }

  interface NavGroup {
    section: string;
    items: NavItem[];
  }

  const getItemTheme = (path: string) => {
    switch (path) {
      case '/dashboard':
        return {
          icon: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/50',
          border: 'border-blue-200/80 dark:border-blue-800/60',
          text: 'text-blue-950 dark:text-blue-200'
        };
      case '/analytics':
        return {
          icon: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-50/80 hover:bg-purple-100/80 dark:bg-purple-950/40 dark:hover:bg-purple-900/50',
          border: 'border-purple-200/80 dark:border-purple-800/60',
          text: 'text-purple-950 dark:text-purple-200'
        };
      case '/orders':
        return {
          icon: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50',
          border: 'border-emerald-200/80 dark:border-emerald-800/60',
          text: 'text-emerald-950 dark:text-emerald-200'
        };
      case '/categories':
        return {
          icon: 'text-cyan-600 dark:text-cyan-400',
          bg: 'bg-cyan-50/80 hover:bg-cyan-100/80 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50',
          border: 'border-cyan-200/80 dark:border-cyan-800/60',
          text: 'text-cyan-950 dark:text-cyan-200'
        };
      case '/menu-items':
        return {
          icon: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/50',
          border: 'border-amber-200/80 dark:border-amber-800/60',
          text: 'text-amber-950 dark:text-amber-200'
        };
      case '/discounts':
        return {
          icon: 'text-rose-600 dark:text-rose-400',
          bg: 'bg-rose-50/80 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:hover:bg-rose-900/50',
          border: 'border-rose-200/80 dark:border-rose-800/60',
          text: 'text-rose-950 dark:text-rose-200'
        };
      case '/contests':
        return {
          icon: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50/80 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/50',
          border: 'border-amber-200/80 dark:border-amber-800/60',
          text: 'text-amber-950 dark:text-amber-200'
        };
      case '/qr-code':
        return {
          icon: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50',
          border: 'border-indigo-200/80 dark:border-indigo-800/60',
          text: 'text-indigo-950 dark:text-indigo-200'
        };
      case '/shop-setup':
        return {
          icon: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-50/80 hover:bg-orange-100/80 dark:bg-orange-950/40 dark:hover:bg-orange-900/50',
          border: 'border-orange-200/80 dark:border-orange-800/60',
          text: 'text-orange-950 dark:text-orange-200'
        };
      case '/members':
        return {
          icon: 'text-sky-600 dark:text-sky-400',
          bg: 'bg-sky-50/80 hover:bg-sky-100/80 dark:bg-sky-950/40 dark:hover:bg-sky-900/50',
          border: 'border-sky-200/80 dark:border-sky-800/60',
          text: 'text-sky-950 dark:text-sky-200'
        };
      case '/customize':
        return {
          icon: 'text-fuchsia-600 dark:text-fuchsia-400',
          bg: 'bg-fuchsia-50/80 hover:bg-fuchsia-100/80 dark:bg-fuchsia-950/40 dark:hover:bg-fuchsia-900/50',
          border: 'border-fuchsia-200/80 dark:border-fuchsia-800/60',
          text: 'text-fuchsia-950 dark:text-fuchsia-200'
        };
      case '/settings':
        return {
          icon: 'text-teal-600 dark:text-teal-400',
          bg: 'bg-teal-50/80 hover:bg-teal-100/80 dark:bg-teal-950/40 dark:hover:bg-teal-900/50',
          border: 'border-teal-200/80 dark:border-teal-800/60',
          text: 'text-teal-950 dark:text-teal-200'
        };
      case '/settlements':
        return {
          icon: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50',
          border: 'border-emerald-200/80 dark:border-emerald-800/60',
          text: 'text-emerald-950 dark:text-emerald-200'
        };
      default:
        return {
          icon: 'text-teal-600 dark:text-teal-400',
          bg: 'bg-teal-50/80 hover:bg-teal-100/80 dark:bg-teal-950/40 dark:hover:bg-teal-900/50',
          border: 'border-teal-200/80 dark:border-teal-800/60',
          text: 'text-teal-950 dark:text-teal-200'
        };
    }
  };

  const navGroups: NavGroup[] = [
    {
      section: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Analytics', path: '/analytics', icon: LineChart },
      ]
    },
    {
      section: 'Core Operations',
      items: [
        { name: 'Orders', path: '/orders', icon: ShoppingBag },
        { name: 'Categories', path: '/categories', icon: MenuSquare },
        { name: 'Menus', path: '/menu-items', icon: Coffee },
      ]
    },
    {
      section: 'Marketing & Growth',
      items: [
        { name: 'Discounts', path: '/discounts', icon: Tag },
        { name: 'Contests', path: '/contests', icon: Trophy },
        { name: 'QR Code', path: '/qr-code', icon: QrCode },
      ]
    },
    {
      section: 'Management & System',
      items: [
        { name: 'Shop', path: '/shop-setup', icon: Store },
        { name: 'Members', path: '/members', icon: Users },
        { name: 'Customize Theme', path: '/customize', icon: Palette },
        { name: 'Subscription', path: '/subscription', icon: Sparkles },
        { name: 'Settlements', path: '/settlements', icon: Wallet },
        { name: 'Settings', path: '/settings', icon: SettingsIcon },
      ]
    }
  ];

  const mobileNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', path: '/orders', icon: ShoppingBag },
    { name: 'Categories', path: '/categories', icon: MenuSquare },
    { name: 'Menus', path: '/menu-items', icon: Coffee },
  ];

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50/50 dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 h-screen overflow-hidden">
        {/* Desktop Sidebar Top Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={logo} alt="Menukit Logo" className="h-8 w-auto object-contain shrink-0" />
            <div className="min-w-0">
              <h2 className="font-heading font-black text-base text-slate-900 dark:text-white leading-none truncate">Menukit</h2>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Merchant Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <NotificationBell />
            <button 
              onClick={() => setIsLanguageModalOpen(true)}
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Change Language"
            >
              <Languages size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 p-3.5 space-y-5 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.section} className="space-y-1">
              <h3 className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                {group.section}
              </h3>
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                const theme = getItemTheme(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <Icon size={18} className={isActive ? "text-white" : theme.icon} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* FIXED Bottom User Profile & Sign Out */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shrink-0">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'M'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
              <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => setIsSignOutModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* FIXED Mobile Header Bar */}
        <div className="lg:hidden h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30 relative overflow-hidden">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 shrink-0 z-20">
            <img src={logo} alt="Menukit Logo" className="h-7 w-auto object-contain transition-transform duration-300" />
            <span className={cn(
              "font-heading font-black text-sm text-slate-900 dark:text-white transition-all duration-300 inline-block",
              isScrolled ? "opacity-0 -translate-x-3 max-w-0 overflow-hidden" : "opacity-100 translate-x-0 max-w-[100px]"
            )}>
              Menukit
            </span>
          </div>

          {/* Centered Page Title (Appears smoothly when scrolled) */}
          <div className={cn(
            "absolute left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-none flex items-center justify-center h-full text-center px-2 z-10",
            isScrolled ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95"
          )}>
            <h1 className="text-xs font-black text-slate-900 dark:text-white truncate font-heading max-w-[160px] sm:max-w-[240px]">
              {headerTitle}
            </h1>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 shrink-0 z-20">
            <NotificationBell />
            <button 
              onClick={() => setIsLanguageModalOpen(true)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
            >
              <Languages size={16} />
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
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 relative"
          onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 20)}
        >
          <Outlet />
        </main>
      </div>

      {/* FIXED Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-40 flex justify-around items-center px-1 safe-area-bottom shadow-lg">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all",
                isActive ? "text-primary font-bold scale-105" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Icon size={20} className={isActive ? "text-primary" : "text-slate-500 dark:text-slate-400"} />
              <span className="text-[10px] font-bold">{item.name}</span>
            </NavLink>
          );
        })}
        
        {/* More Button */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
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
                      onClick={() => setIsMoreMenuOpen(false)}
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
