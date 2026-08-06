import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { ThemeProvider } from '@/components/ThemeProvider';

// Layouts
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

// Auth Pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const OTPVerifyPage = lazy(() => import('@/pages/auth/OTPVerifyPage').then(m => ({ default: m.OTPVerifyPage })));

// Dashboard Pages
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ShopSetupPage = lazy(() => import('@/pages/shop/ShopSetupPage').then(m => ({ default: m.ShopSetupPage })));
const CategoriesPage = lazy(() => import('@/pages/menu/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const MenuItemsPage = lazy(() => import('@/pages/menu/MenuItemsPage').then(m => ({ default: m.MenuItemsPage })));
const BulkUploadPage = lazy(() => import('@/pages/menu/BulkUploadPage').then(m => ({ default: m.BulkUploadPage })));
const JsonBulkUploadPage = lazy(() => import('@/pages/menu/JsonBulkUploadPage').then(m => ({ default: m.JsonBulkUploadPage })));
const CustomizeThemePage = lazy(() => import('@/pages/theme/CustomizeThemePage').then(m => ({ default: m.CustomizeThemePage })));
const QRCodePage = lazy(() => import('@/pages/qr/QRCodePage').then(m => ({ default: m.QRCodePage })));
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const DiscountsPage = lazy(() => import('@/pages/discounts/DiscountsPage').then(m => ({ default: m.DiscountsPage })));
const ContestsPage = lazy(() => import('@/pages/contests/ContestsPage').then(m => ({ default: m.ContestsPage })));
const InternalBulkPage = lazy(() => import('@/pages/admin/InternalBulkPage').then(m => ({ default: m.InternalBulkPage })));
const MembersPage = lazy(() => import('@/pages/members/MembersPage').then(m => ({ default: m.MembersPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SettlementsPage = lazy(() => import('@/pages/settlements/SettlementsPage').then(m => ({ default: m.SettlementsPage })));
const SubscriptionMarketplacePage = lazy(() => import('@/pages/subscription/SubscriptionMarketplacePage').then(m => ({ default: m.SubscriptionMarketplacePage })));
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage').then(m => ({ default: m.OrdersPage })));

// Public Pages
const PublicMenuPage = lazy(() => import('@/pages/public/PublicMenuPage').then(m => ({ default: m.PublicMenuPage })));
const PublicItemPage = lazy(() => import('@/pages/public/PublicItemPage').then(m => ({ default: m.PublicItemPage })));
const PublicCartPage = lazy(() => import('@/pages/public/PublicCartPage').then(m => ({ default: m.PublicCartPage })));
const OrderStatusPage = lazy(() => import('@/pages/public/OrderStatusPage').then(m => ({ default: m.OrderStatusPage })));
const PublicOrdersPage = lazy(() => import('@/pages/public/PublicOrdersPage').then(m => ({ default: m.PublicOrdersPage })));
const TermsPage = lazy(() => import('@/pages/public/TermsPage').then(m => ({ default: m.TermsPage })));
const StoreDiscoveryPage = lazy(() => import('@/pages/public/StoreDiscoveryPage').then(m => ({ default: m.StoreDiscoveryPage })));
const PublicContestPage = lazy(() => import('./pages/public/PublicContestPage').then(m => ({ default: m.PublicContestPage })));
const CustomerProfilePage = lazy(() => import('./pages/public/CustomerProfilePage').then(m => ({ default: m.CustomerProfilePage })));

const AdminPlaceholder = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <h1 className="text-2xl font-bold font-heading mb-2">Admin Dashboard</h1>
      <p className="text-slate-500">Super admin management area coming soon.</p>
    </div>
  </div>
);

function App() {
  const { fetchUser, isLoading } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-otp" element={<OTPVerifyPage />} />
      </Route>
      
      {/* Dashboard Routes (Protected) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<ThemeProvider><DashboardLayout /></ThemeProvider>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/shop-setup" element={<ShopSetupPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/menu-items" element={<MenuItemsPage />} />
          <Route path="/bulk-upload" element={<BulkUploadPage />} />
          <Route path="/json-bulk-upload" element={<JsonBulkUploadPage />} />
          <Route path="/customize" element={<CustomizeThemePage />} />
          <Route path="/qr-code" element={<QRCodePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/discounts" element={<DiscountsPage />} />
          <Route path="/contests" element={<ContestsPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settlements" element={<SettlementsPage />} />
          <Route path="/subscription" element={<SubscriptionMarketplacePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/internal-bulk" element={<InternalBulkPage />} />
          <Route path="/admin" element={<AdminPlaceholder />} />
        </Route>
      </Route>

      {/* Public Routes */}
      <Route path="/discover" element={<StoreDiscoveryPage />} />
      <Route path="/discover/stores" element={<StoreDiscoveryPage />} />
      <Route path="/discover/scan" element={<StoreDiscoveryPage />} />
      <Route path="/shop/:id" element={<PublicMenuPage />} />
      <Route path="/shop/:id/item/:itemId" element={<PublicItemPage />} />
      <Route path="/shop/:id/cart" element={<PublicCartPage />} />
      <Route path="/shop/:id/contest" element={<PublicContestPage />} />
      <Route path="/shop/:id/contest/:contestId" element={<PublicContestPage />} />

      <Route path="/shop/:id/orders" element={<PublicOrdersPage />} />
      <Route path="/shop/:id/order/:orderId" element={<OrderStatusPage />} />
      <Route path="/shop/:id/profile" element={<CustomerProfilePage />} />
      <Route path="/profile" element={<CustomerProfilePage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Fallback routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
      </Suspense>
  )
}

export default App
