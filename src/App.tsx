import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { ThemeProvider } from '@/components/ThemeProvider';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}

// Layouts
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PermissionGuard } from '@/components/PermissionGuard';

// Auth Pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const OTPVerifyPage = lazy(() => import('@/pages/auth/OTPVerifyPage').then(m => ({ default: m.OTPVerifyPage })));
const MCPAuthPage = lazy(() => import('@/pages/auth/MCPAuthPage').then(m => ({ default: m.MCPAuthPage })));
const OAuthConsentPage = lazy(() => import('@/pages/auth/OAuthConsentPage').then(m => ({ default: m.OAuthConsentPage })));
const VerifyEmployeePage = lazy(() => import('@/pages/auth/VerifyEmployeePage').then(m => ({ default: m.VerifyEmployeePage })));

import { lazyWithPreload, registerPreload } from '@/utils/lazyWithPreload';

// Dashboard Pages
const DashboardPage = lazyWithPreload(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ShopSetupPage = lazyWithPreload(() => import('@/pages/shop/ShopSetupPage').then(m => ({ default: m.ShopSetupPage })));
const CategoriesPage = lazyWithPreload(() => import('@/pages/menu/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const MenuItemsPage = lazyWithPreload(() => import('@/pages/menu/MenuItemsPage').then(m => ({ default: m.MenuItemsPage })));
const BulkUploadPage = lazyWithPreload(() => import('@/pages/menu/BulkUploadPage').then(m => ({ default: m.BulkUploadPage })));
const JsonBulkUploadPage = lazyWithPreload(() => import('@/pages/menu/JsonBulkUploadPage').then(m => ({ default: m.JsonBulkUploadPage })));
const CustomizeThemePage = lazyWithPreload(() => import('@/pages/theme/CustomizeThemePage').then(m => ({ default: m.CustomizeThemePage })));
const QRCodePage = lazyWithPreload(() => import('@/pages/qr/QRCodePage').then(m => ({ default: m.QRCodePage })));
const AnalyticsPage = lazyWithPreload(() => import('@/pages/analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const DiscountsPage = lazyWithPreload(() => import('@/pages/discounts/DiscountsPage').then(m => ({ default: m.DiscountsPage })));
const ContestsPage = lazyWithPreload(() => import('@/pages/contests/ContestsPage').then(m => ({ default: m.ContestsPage })));
const CampaignsPage = lazyWithPreload(() => import('@/pages/marketing/CampaignsPage').then(m => ({ default: m.CampaignsPage })));
const InternalBulkPage = lazyWithPreload(() => import('@/pages/admin/InternalBulkPage').then(m => ({ default: m.InternalBulkPage })));

const MembersPage = lazyWithPreload(() => import('@/pages/members/MembersPage').then(m => ({ default: m.MembersPage })));
const SettingsPage = lazyWithPreload(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const TeamPage = lazyWithPreload(() => import('@/pages/settings/TeamPage').then(m => ({ default: m.TeamPage })));
const SettlementsPage = lazyWithPreload(() => import('@/pages/settlements/SettlementsPage').then(m => ({ default: m.SettlementsPage })));
const SubscriptionMarketplacePage = lazyWithPreload(() => import('@/pages/subscription/SubscriptionMarketplacePage').then(m => ({ default: m.SubscriptionMarketplacePage })));
const NotificationsPage = lazyWithPreload(() => import('@/pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const OrdersPage = lazyWithPreload(() => import('@/pages/orders/OrdersPage').then(m => ({ default: m.OrdersPage })));
const ShopSelectionPage = lazyWithPreload(() => import('@/pages/auth/ShopSelectionPage').then(m => ({ default: m.ShopSelectionPage })));

// Register Dashboard Preloaders
registerPreload('/dashboard', DashboardPage.preload);
registerPreload('/shop-setup', ShopSetupPage.preload);
registerPreload('/categories', CategoriesPage.preload);
registerPreload('/menu-items', MenuItemsPage.preload);
registerPreload('/bulk-upload', BulkUploadPage.preload);
registerPreload('/json-bulk-upload', JsonBulkUploadPage.preload);
registerPreload('/customize', CustomizeThemePage.preload);
registerPreload('/qr-code', QRCodePage.preload);
registerPreload('/analytics', AnalyticsPage.preload);
registerPreload('/orders', OrdersPage.preload);
registerPreload('/discounts', DiscountsPage.preload);
registerPreload('/contests', ContestsPage.preload);
registerPreload('/campaigns', CampaignsPage.preload);
registerPreload('/members', MembersPage.preload);
registerPreload('/settings', SettingsPage.preload);
registerPreload('/settings/team', TeamPage.preload);
registerPreload('/settlements', SettlementsPage.preload);
registerPreload('/subscription', SubscriptionMarketplacePage.preload);
registerPreload('/notifications', NotificationsPage.preload);
registerPreload('/internal-bulk', InternalBulkPage.preload);
registerPreload('/select-shop', ShopSelectionPage.preload);

// Public Pages
const PublicMenuPage = lazy(() => import('@/pages/public/PublicMenuPage').then(m => ({ default: m.PublicMenuPage })));
const PublicItemPage = lazy(() => import('@/pages/public/PublicItemPage').then(m => ({ default: m.PublicItemPage })));
const PublicCartPage = lazy(() => import('@/pages/public/PublicCartPage').then(m => ({ default: m.PublicCartPage })));
const OrderStatusPage = lazy(() => import('@/pages/public/OrderStatusPage').then(m => ({ default: m.OrderStatusPage })));
const PublicOrdersPage = lazy(() => import('@/pages/public/PublicOrdersPage').then(m => ({ default: m.PublicOrdersPage })));
const TermsPage = lazy(() => import('@/pages/public/TermsPage').then(m => ({ default: m.TermsPage })));
const PrivacyPolicyPage = lazy(() => import('@/pages/public/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const StoreDiscoveryPage = lazy(() => import('@/pages/public/StoreDiscoveryPage').then(m => ({ default: m.StoreDiscoveryPage })));
const BrandLandingPage = lazy(() => import('@/pages/public/BrandLandingPage').then(m => ({ default: m.BrandLandingPage })));
const PublicContestPage = lazy(() => import('./pages/public/PublicContestPage').then(m => ({ default: m.PublicContestPage })));
const CustomerProfilePage = lazy(() => import('./pages/public/CustomerProfilePage').then(m => ({ default: m.CustomerProfilePage })));

import Lenis from 'lenis';

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
      <ScrollToTop />
      <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-otp" element={<OTPVerifyPage />} />
      </Route>

      {/* Standalone Route for Employee Verification */}
      <Route path="/verify-employee" element={<VerifyEmployeePage />} />

      {/* Standalone MCP Authorization Route */}
      <Route path="/mcp-auth" element={<MCPAuthPage />} />
      <Route path="/oauth-consent" element={<OAuthConsentPage />} />
      
      {/* Protected Standalone Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/select-shop" element={<ShopSelectionPage />} />
      </Route>
      
      {/* Dashboard Routes (Protected) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<ThemeProvider><DashboardLayout /></ThemeProvider>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/shop-setup" element={<ShopSetupPage />} />
          <Route path="/categories" element={<PermissionGuard module="menu_categories"><CategoriesPage /></PermissionGuard>} />
          <Route path="/menu-items" element={<PermissionGuard module="menu_items"><MenuItemsPage /></PermissionGuard>} />
          <Route path="/bulk-upload" element={<PermissionGuard module="menu_items"><BulkUploadPage /></PermissionGuard>} />
          <Route path="/json-bulk-upload" element={<PermissionGuard module="menu_items"><JsonBulkUploadPage /></PermissionGuard>} />
          <Route path="/customize" element={<PermissionGuard module="settings"><CustomizeThemePage /></PermissionGuard>} />
          <Route path="/qr-code" element={<QRCodePage />} />
          <Route path="/analytics" element={<PermissionGuard module="analytics"><AnalyticsPage /></PermissionGuard>} />
          <Route path="/orders" element={<PermissionGuard module="orders"><OrdersPage /></PermissionGuard>} />
          <Route path="/discounts" element={<PermissionGuard module="discounts"><DiscountsPage /></PermissionGuard>} />
          <Route path="/contests" element={<PermissionGuard module="contests"><ContestsPage /></PermissionGuard>} />
          <Route path="/campaigns" element={<PermissionGuard module="marketing"><CampaignsPage /></PermissionGuard>} />
          <Route path="/members" element={<PermissionGuard module="customers"><MembersPage /></PermissionGuard>} />

          <Route path="/settings" element={<PermissionGuard module="settings"><SettingsPage /></PermissionGuard>} />
          <Route path="/settings/team" element={<PermissionGuard module="team"><TeamPage /></PermissionGuard>} />
          <Route path="/settlements" element={<PermissionGuard module="settlements"><SettlementsPage /></PermissionGuard>} />
          <Route path="/subscription" element={<PermissionGuard module="subscription"><SubscriptionMarketplacePage /></PermissionGuard>} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/internal-bulk" element={<InternalBulkPage />} />
        </Route>
      </Route>

      {/* Public Routes */}
      <Route path="/discover" element={<StoreDiscoveryPage />} />
      <Route path="/discover/stores" element={<StoreDiscoveryPage />} />
      <Route path="/brand/:userId" element={<BrandLandingPage />} />
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
      <Route path="/privacy" element={<PrivacyPolicyPage />} />

      {/* Fallback routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
      </Suspense>
  )
}

export default App
