import { create } from 'zustand';
import { api } from '@/services/api';

export interface ModuleExpirationInfo {
  expires_at?: string | null;
  days_left?: number;
}

export interface SubscriptionStatus {
  is_active: boolean;
  is_all_access: boolean;
  active_modules: string[];
  module_expirations: Record<string, ModuleExpirationInfo>;
  current_period_end: string | null;
  is_trial: boolean;
  is_expired: boolean;
  is_grace_period?: boolean;
  grace_days_left?: number;
  days_left: number;
  core_days_left?: number;
  max_days_left?: number;
  has_expiring_modules?: boolean;
  has_expired_modules?: boolean;
  expired_modules_count?: number;
  expired_modules?: string[];
  status_message?: string;
  auto_renew?: boolean;
  has_mandate?: boolean;
  billing_cycle?: string;
  free_trial_days?: number;
  grace_period_days?: number;
}

interface SubscriptionStoreState {
  subscriptionStatus: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;
  fetchSubscription: () => Promise<void>;
  setSubscriptionStatus: (status: SubscriptionStatus | null) => void;
}

export const useSubscriptionStore = create<SubscriptionStoreState>((set) => ({
  subscriptionStatus: null,
  isLoading: false,
  error: null,
  fetchSubscription: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/subscription/current');
      set({ subscriptionStatus: res.data, isLoading: false });
    } catch (err: any) {
      console.error('Failed to fetch subscription status:', err);
      set({ error: err.message || 'Failed to fetch subscription', isLoading: false });
    }
  },
  setSubscriptionStatus: (status) => set({ subscriptionStatus: status }),
}));

export function isModuleActive(
  status: any | null,
  moduleKey: 'orders' | 'members' | 'analytics' | 'theme' | 'schemes' | string
): boolean {
  if (!status) return true; // loading or unknown, fail open or wait

  // 1. Subscription & billing management is ALWAYS accessible so merchants can pay and renew!
  if (moduleKey === 'subscription' || moduleKey === 'billing' || moduleKey === 'plans') {
    return true;
  }

  // 2. Core administrative and business settings/settlements are never blocked
  if (moduleKey === 'settings' || moduleKey === 'settlements' || moduleKey === 'team' || moduleKey === 'staff') {
    return true;
  }

  // Mapping from frontend module identifier to marketplace module ID(s)
  const moduleMap: Record<string, string[]> = {
    'orders': ['online-orders'],
    'customers': ['member-details', 'new-member', 'member-count'],
    'members': ['member-details', 'new-member', 'member-count'],
    'analytics': ['analytics-advanced'],
    'theme': ['custom-theme'],
    'customize': ['custom-theme'],
  };

  const targetAddons = moduleMap[moduleKey];
  if (!targetAddons) {
    // Core free module (categories, menu_items, etc.)
    return true;
  }

  // If core subscription is expired, all paid add-ons are locked
  if (status.is_expired) return false;

  const activeModules: string[] = status.active_modules || [];
  const expirations = status.module_expirations || {};

  return targetAddons.some((addonId) => {
    const exp = expirations[addonId];
    if (exp && typeof exp.days_left === 'number') {
      if (exp.days_left <= 0) return false;
      return true;
    }

    if (status.is_all_access) return true;

    return activeModules.includes(addonId);
  });
}
