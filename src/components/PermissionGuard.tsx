import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { usePermissions } from '@/hooks/usePermissions';
import { useShopStore } from '@/store/shopStore';
import { useSubscriptionStore, isModuleActive } from '@/store/subscriptionStore';
import { AccessDenied } from './ui/AccessDenied';
import { Lock, ArrowRight, Clock } from 'lucide-react';

interface PermissionGuardProps {
  module: string;
  children: ReactNode;
  requireWrite?: boolean;
}

export function PermissionGuard({ module, children, requireWrite = false }: PermissionGuardProps) {
  const { shop } = useShopStore();
  const navigate = useNavigate();
  const { canRead, canWrite } = usePermissions(module);
  const { subscriptionStatus, isLoading: isSubLoading, fetchSubscription } = useSubscriptionStore();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isCreateNew = location.state?.createNew === true || searchParams.get('create') === 'true' || searchParams.get('new') === 'true';

  useEffect(() => {
    if (!subscriptionStatus && !isSubLoading) {
      fetchSubscription();
    }
  }, [subscriptionStatus, isSubLoading, fetchSubscription]);

  // Always allow creating a new shop
  if (isCreateNew && location.pathname === '/shop-setup') {
    return <>{children}</>;
  }

  if (!shop) {
    if (module === 'settings') {
      return <>{children}</>;
    }
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 1. Modular Subscription Feature Expiration Check
  const moduleActive = isModuleActive(subscriptionStatus, module);
  if (!moduleActive) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 min-h-[480px]">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-lg relative overflow-hidden">
          {/* Subtle decorative background gradient */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-orange-500/10 dark:bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Lock Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center mx-auto mb-5 shadow-xs text-amber-600 dark:text-amber-400">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold mb-3 border border-rose-200 dark:border-rose-800/60 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>0 Days Remaining</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 font-heading">
            Feature Locked — Subscription Required
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Your access to this module has expired (0 days left). Please renew this add-on in your subscription plans to continue.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/subscription?tab=marketplace')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer group"
            >
              <span>Renew Add-on</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Employee Permissions Check
  const hasAccess = requireWrite ? canWrite : canRead;

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
