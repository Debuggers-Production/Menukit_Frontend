import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Store, 
  MenuSquare, 
  Coffee, 
  Palette, 
  QrCode, 
  LineChart, 
  LogOut,
  User as UserIcon,
  MoreHorizontal,
  Languages,
  Settings as SettingsIcon,
  Tag,
  Users
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { GoogleTranslate } from '@/components/GoogleTranslate';
import { LanguageSelectorModal } from '@/components/LanguageSelectorModal';
import { useHeaderStore } from '@/store/useHeaderStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { NotificationBell } from '@/components/ui/NotificationBell';
import logo from "../assets/menukit-logo.svg";

export function DashboardLayout() {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const headerTitle = useHeaderStore((state) => state.title);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  useWebSocket();

  interface NavItem {
    name: string;
    path: string;
    icon: any;
    disabled?: boolean;
    label?: string;
  }

  const mainNavItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Categories', path: '/categories', icon: MenuSquare },
    { name: 'Menus', path: '/menu-items', icon: Coffee },
    { name: 'Discounts', path: '/discounts', icon: Tag },
  ];

  const freemiumItems: NavItem[] = [
    { name: 'Shop', path: '/shop-setup', icon: Store },
    { name: 'Analytics', path: '/analytics', icon: LineChart },
    { name: 'QR Code', path: '/qr-code', icon: QrCode },
  ];

  const premiumItems: NavItem[] = [
    { name: 'Members', path: '/members', icon: Users },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
    { name: 'Customize Theme', path: '/customize', icon: Palette },
  ];

  const allNavItems = [...mainNavItems, ...freemiumItems, ...premiumItems];

  const renderNavGrid = (title: string, items: NavItem[], colors: any[]) => (
    <div>
      <h3 className="text-[10px] font-bold tracking-widest text-slate-400 mb-4 uppercase">{title}</h3>
      <div className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-4">
        {items.map((item, index) => {
          const color = colors[index % colors.length];
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.disabled ? '#' : item.path}
              onClick={(e) => {
                if (item.disabled) e.preventDefault();
                else setIsMoreMenuOpen(false);
              }}
              className={cn(
                "flex flex-col items-center group w-[72px]",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105 shadow-sm",
                color.bg, color.text
              )}>
                <Icon size={20} strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">
                {item.name}
              </span>
              {item.label && (
                <span className="mt-1 text-[7px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-600 px-1 py-0.5 rounded-sm whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 flex pb-16 lg:pb-0">
      <GoogleTranslate />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col h-full">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className='flex items-center'>
            <div className="w-12 h-12 flex items-center justify-center">
                <img src={logo} alt="MenuKit-Logo" className="w-full h-full" />
            </div>
            <h1 className="text-xl font-heading font-bold text-primary">Menukit</h1>
          </div>
          
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button 
              onClick={() => setIsLanguageModalOpen(true)}
              className="p-2 text-slate-500 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-full"
              title="Change Language"
            >
              <Languages size={24} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {allNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.path}
                to={item.disabled ? '#' : item.path}
                onClick={(e) => {
                  if (item.disabled) {
                    e.preventDefault();
                  }
                }}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative overflow-hidden group",
                  isActive 
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                  item.disabled && "cursor-not-allowed pointer-events-none"
                )}
              >
                <div className={cn("flex items-center", item.disabled && "opacity-40")}>
                  <Icon size={18} className={cn("mr-3", isActive ? "text-primary-600 dark:text-primary-400" : "text-slate-400")} />
                  {item.name}
                </div>
                {item.label && (
                  <span className="ml-auto text-[9px] font-extrabold uppercase tracking-widest bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 px-2.5 py-0.5 rounded-full ring-1 ring-amber-400/30 shadow-sm shadow-amber-400/20">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center px-3 py-2 mb-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-700 font-semibold text-sm mr-3">
              <UserIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {user?.email}
              </p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={18} className="mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile Top Header */}
        <div className="lg:hidden relative flex items-center justify-between px-4 h-14 bg-white/20 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-800/50 shrink-0 z-30 shadow-sm">
          
          {/* Logo container */}
          <div className={cn(
            "absolute top-0 bottom-0 flex items-center transition-all duration-300 ease-in-out",
            isScrolled ? "left-4 translate-x-0" : "left-1/2 -translate-x-1/2"
          )}>
            <div className="w-10 h-10 flex items-center justify-center">
                <img src={logo} alt="MenuKit-Logo" className="w-full h-full" />
            </div>
            <span className={cn(
              "font-bold bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent transition-all duration-300 overflow-hidden whitespace-nowrap",
              isScrolled ? "w-0 opacity-0 ml-0" : "w-[65px] opacity-100 ml-1 text-base"
            )}>
              Menukit
            </span>
          </div>

          <div className="flex-1"></div>

          {/* Centered Page Title */}
          <div className={cn(
            "absolute left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-none flex items-center h-full",
            isScrolled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <h1 className="text-base font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{headerTitle}</h1>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <NotificationBell />
            <button 
              onClick={() => setIsLanguageModalOpen(true)}
              className="w-8 h-8 rounded-full bg-white/50 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              <Languages size={18} />
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8"
          onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 30)}
        >
          <div className="max-w-6xl mx-auto animate-fade-in pb-4">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Bottom App Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 z-40 flex justify-around items-center px-2 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {mainNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                isActive ? "text-primary" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <Icon size={22} className={isActive ? "fill-primary/20" : ""} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          );
        })}
        
        {/* More Button */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <MoreHorizontal size={22} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>

      {/* More Menu Modal */}
      <Modal
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        className="mt-auto rounded-b-none sm:rounded-b-2xl sm:mt-0 p-0 sm:p-0 overflow-hidden"
      >
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-[#E83BFE] flex items-center justify-center text-white font-bold text-sm mr-3 shadow-sm">
                {user?.email?.substring(0,2).toUpperCase() || <UserIcon size={18} />}
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate capitalize">
                  {user?.email ? user.email.split('@')[0] : 'Developer'}
                </p>
                <p className="text-[10px] text-slate-500">Manage your account</p>
              </div>
            </div>
          </div>

          {/* Grid Content */}
          <div className="px-6 py-5 space-y-6">
            {renderNavGrid("Freemium", freemiumItems, [
              { text: 'text-[#10B981]', bg: 'bg-[#ECFDF5] dark:bg-emerald-500/10' }, // green
              { text: 'text-[#3B82F6]', bg: 'bg-[#EFF6FF] dark:bg-blue-500/10' }, // blue
            ])}
            {renderNavGrid("Premium", premiumItems, [
              { text: 'text-[#8B5CF6]', bg: 'bg-[#F5F3FF] dark:bg-purple-500/10' }, // purple
              { text: 'text-[#F59E0B]', bg: 'bg-[#FFFBEB] dark:bg-amber-500/10' }, // yellow
            ])}
          </div>

          {/* Bottom Actions */}
          <div className="px-6 pt-4 pb-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex gap-3">
              <NavLink
                to="/settings"
                onClick={() => setIsMoreMenuOpen(false)}
                className="flex items-center justify-center flex-1 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all group shadow-sm"
              >
                <SettingsIcon size={16} className="mr-2 text-slate-500" />
                Settings
              </NavLink>
              
              <button
                onClick={() => setIsSignOutModalOpen(true)}
                className="flex items-center justify-center flex-1 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 transition-all group shadow-sm"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <LanguageSelectorModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        primaryColor="#f97316"
      />

      {/* Sign Out Confirmation Modal */}
      <Modal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        title="Sign Out"
        description="Are you sure you want to sign out?"
        className="max-w-sm"
      >
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setIsSignOutModalOpen(false)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setIsSignOutModalOpen(false);
              setIsMoreMenuOpen(false);
              logout();
            }}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </Modal>
    </div>
  );
}
