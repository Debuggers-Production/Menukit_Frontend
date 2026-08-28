import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useShopStore } from '@/store/shopStore';
import { AccessDenied } from './ui/AccessDenied';

interface PermissionGuardProps {
  module: string;
  children: ReactNode;
  requireWrite?: boolean;
}

export function PermissionGuard({ module, children, requireWrite = false }: PermissionGuardProps) {
  const { shop } = useShopStore();
  const { canRead, canWrite } = usePermissions(module);

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

  const hasAccess = requireWrite ? canWrite : canRead;

  if (!hasAccess) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
