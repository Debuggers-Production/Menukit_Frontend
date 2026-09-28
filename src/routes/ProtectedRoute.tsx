import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { LogoLoader } from '@/components/ui/LogoLoader';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
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

  // Mandatory Mobile Phone Verification Enforcement
  if (user && !user.phone_verified && location.pathname !== '/verify-phone') {
    return <Navigate to="/verify-phone" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
