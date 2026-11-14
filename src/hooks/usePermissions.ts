import { useShopStore } from '@/store/shopStore';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore, isModuleActive } from '@/store/subscriptionStore';

export function usePermissions(module: string) {
  const { shop } = useShopStore();
  const { user } = useAuthStore();
  const { subscriptionStatus } = useSubscriptionStore();

  const isOwner = Boolean(
    shop && user && (
      (shop.user_id && String(shop.user_id) === String(user.id)) ||
      !shop.employee_permissions
    )
  );

  const isSubActive = isModuleActive(subscriptionStatus, module);

  const getModulePermissions = (): string[] => {
    if (!module) return [];
    if (isOwner) return ['read', 'write', 'delete'];
    if (!shop?.employee_permissions) return [];

    let p = shop.employee_permissions[module];
    if ((!p || p.length === 0) && (module === 'campaigns' || module === 'marketing')) {
      p = shop.employee_permissions['campaigns'] || shop.employee_permissions['marketing'];
    }
    if ((!p || p.length === 0) && module === 'chalkboard') {
      p = shop.employee_permissions['chalkboard'] || shop.employee_permissions['settings'];
    }
    if ((!p || p.length === 0) && module === 'schemes') {
      p = shop.employee_permissions['schemes'] || shop.employee_permissions['orders'] || shop.employee_permissions['settings'];
    }

    return p || [];
  };

  const perms = getModulePermissions();
  const hasEmployeeRead = isOwner || perms.includes('read') || perms.includes('write');
  const hasEmployeeWrite = isOwner || perms.includes('write');

  return {
    canRead: isSubActive && hasEmployeeRead,
    canWrite: isSubActive && hasEmployeeWrite,
    isSubscriptionActive: isSubActive,
    isOwner,
  };
}
