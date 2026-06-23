import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { LogoLoader } from '@/components/ui/LogoLoader';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <LogoLoader size={56} text="AUTHENTICATING..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
