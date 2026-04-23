import { lazy, Suspense, useState, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TenantProvider } from '@/components/TenantProvider';
import { UpgradeModal } from '@/components/UpgradeModal';
import { setUpgradeModalHandler } from '@/lib/api';
import { isMainDomain } from '@/utils/tenant';
import { useBranding } from '@/hooks/useBranding';

// Lazy-load every page bundle so only the current route's JS is downloaded
const OrganizationSignup = lazy(() => import('@/pages/signup/OrganizationSignup').then(m => ({ default: m.OrganizationSignup })));
const PricingPage        = lazy(() => import('@/pages/signup/PricingPage').then(m => ({ default: m.PricingPage })));
const LandingPage        = lazy(() => import('@/pages/marketing/LandingPage').then(m => ({ default: m.LandingPage })));
const DashboardPage    = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.DashboardPage })));
const OrdersPage       = lazy(() => import('@/pages/Orders').then(m => ({ default: m.OrdersPage })));
const CustomersPage    = lazy(() => import('@/pages/Customers').then(m => ({ default: m.CustomersPage })));
const InventoryPage    = lazy(() => import('@/pages/Inventory').then(m => ({ default: m.InventoryPage })));
const PurchaseOrderListPage = lazy(() => import('@/pages/purchase-orders/PurchaseOrderList').then(m => ({ default: m.PurchaseOrderListPage })));
const CreatePOPage = lazy(() => import('@/pages/purchase-orders/CreatePO').then(m => ({ default: m.CreatePOPage })));
const PurchaseOrderDetailPage = lazy(() => import('@/pages/purchase-orders/PurchaseOrderDetail').then(m => ({ default: m.PurchaseOrderDetailPage })));
const VendorListPage = lazy(() => import('@/pages/vendors/VendorList').then(m => ({ default: m.VendorListPage })));
const VendorDetailPage = lazy(() => import('@/pages/vendors/VendorDetail').then(m => ({ default: m.VendorDetailPage })));
const AddEditVendorPage = lazy(() => import('@/pages/vendors/AddEditVendor').then(m => ({ default: m.AddEditVendorPage })));
const ShipmentListPage = lazy(() => import('@/pages/shipments/ShipmentList').then(m => ({ default: m.ShipmentListPage })));
const ShipmentDetailPage = lazy(() => import('@/pages/shipments/ShipmentDetail').then(m => ({ default: m.ShipmentDetailPage })));
const ReportsPageRouter  = lazy(() => import('@/pages/Reports').then(m => ({ default: m.ReportsPageRouter })));
const SettingsPageRouter = lazy(() => import('@/pages/Settings').then(m => ({ default: m.SettingsPageRouter })));
const POSPage          = lazy(() => import('@/pages/POS').then(m => ({ default: m.POSPage })));
const SignInPage       = lazy(() => import('@/pages/SignIn').then(m => ({ default: m.SignInPage })));
const ProductListPage  = lazy(() => import('@/pages/products/ProductList').then(m => ({ default: m.ProductListPage })));
const ProductDetailPage = lazy(() => import('@/pages/products/ProductDetail').then(m => ({ default: m.ProductDetailPage })));
const AddEditProductPage = lazy(() => import('@/pages/products/AddEditProduct').then(m => ({ default: m.AddEditProductPage })));

function PageFallback(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );
}

// ─── Routers ──────────────────────────────────────────────────────────────────

/** Routes shown when on the main domain (yourapp.com) — marketing + auth */
const mainDomainRouter = createBrowserRouter([
  { index: true,    element: <Suspense fallback={<PageFallback />}><LandingPage /></Suspense> },
  { path: '/pricing', element: <Suspense fallback={<PageFallback />}><PricingPage /></Suspense> },
  { path: '/signup',  element: <Suspense fallback={<PageFallback />}><OrganizationSignup /></Suspense> },
  { path: '/sign-in/*', element: <Suspense fallback={<PageFallback />}><SignInPage /></Suspense> },
  // After Clerk redirects to /dashboard on localhost (no subdomain), send user to signup flow
  { path: '/dashboard', element: <Navigate to="/signup" replace /> },
  { path: '*',       element: <Navigate to="/" replace /> },
]);

/** Routes shown when on an org subdomain (acme.yourapp.com) — the full app */
const appRouter = createBrowserRouter([
  {
    path: '/sign-in/*',
    element: <Suspense fallback={<PageFallback />}><SignInPage /></Suspense>,
  },
  {
    // Support both /signup and /sign-up (Clerk uses the hyphenated version)
    path: '/signup',
    element: <Suspense fallback={<PageFallback />}><OrganizationSignup /></Suspense>,
  },
  {
    path: '/sign-up/*',
    element: <Suspense fallback={<PageFallback />}><OrganizationSignup /></Suspense>,
  },
  {
    path: '/pricing',
    element: <Suspense fallback={<PageFallback />}><PricingPage /></Suspense>,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <ErrorBoundary><MainLayout /></ErrorBoundary>,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          {
            path: '/products',
            children: [
              { index: true, element: <Suspense fallback={<PageFallback />}><ProductListPage /></Suspense> },
              { path: 'new', element: <Suspense fallback={<PageFallback />}><AddEditProductPage /></Suspense> },
              { path: ':id', element: <Suspense fallback={<PageFallback />}><ProductDetailPage /></Suspense> },
              { path: ':id/edit', element: <Suspense fallback={<PageFallback />}><AddEditProductPage /></Suspense> },
            ]
          },
          {
            path: '/dashboard',
            element: <Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>
          },
          {
            path: '/orders/*',
            element: <Suspense fallback={<PageFallback />}><OrdersPage /></Suspense>
          },
          {
            path: '/customers/*',
            element: <Suspense fallback={<PageFallback />}><CustomersPage /></Suspense>
          },
          {
            path: '/inventory/*',
            element: <Suspense fallback={<PageFallback />}><InventoryPage /></Suspense>
          },
          {
            path: '/purchase-orders',
            children: [
              { index: true, element: <Suspense fallback={<PageFallback />}><PurchaseOrderListPage /></Suspense> },
              { path: 'new', element: <Suspense fallback={<PageFallback />}><CreatePOPage /></Suspense> },
              { path: ':id', element: <Suspense fallback={<PageFallback />}><PurchaseOrderDetailPage /></Suspense> },
            ]
          },
          {
            path: '/vendors',
            children: [
              { index: true, element: <Suspense fallback={<PageFallback />}><VendorListPage /></Suspense> },
              { path: 'new', element: <Suspense fallback={<PageFallback />}><AddEditVendorPage /></Suspense> },
              { path: ':id', element: <Suspense fallback={<PageFallback />}><VendorDetailPage /></Suspense> },
              { path: ':id/edit', element: <Suspense fallback={<PageFallback />}><AddEditVendorPage /></Suspense> },
            ]
          },
          {
            path: '/shipments',
            children: [
              { index: true, element: <Suspense fallback={<PageFallback />}><ShipmentListPage /></Suspense> },
              { path: ':id', element: <Suspense fallback={<PageFallback />}><ShipmentDetailPage /></Suspense> },
            ]
          },
          {
            path: '/reports/*',
            element: <Suspense fallback={<PageFallback />}><ReportsPageRouter /></Suspense>
          },
          {
            path: '/settings/*',
            element: <Suspense fallback={<PageFallback />}><SettingsPageRouter /></Suspense>
          },
          {
            path: '/pos/*',
            element: <Suspense fallback={<PageFallback />}><POSPage /></Suspense>
          },
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
]);

// ─── Branding loader ──────────────────────────────────────────────────────────
// Runs useBranding() inside TenantProvider so auth/tenant context is available.
// Renders nothing — only applies CSS vars, favicon, and document title as effects.

function BrandingLoader(): null {
  useBranding();
  return null;
}

// ─── Root component ───────────────────────────────────────────────────────────

export function App(): React.JSX.Element {
  const [upgradeMessage, setUpgradeMessage] = useState<string | undefined>();
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    setUpgradeModalHandler((msg) => {
      setUpgradeMessage(msg);
      setShowUpgrade(true);
    });
  }, []);

  const router = isMainDomain() ? mainDomainRouter : appRouter;

  return (
    <TenantProvider>
      <BrandingLoader />
      <RouterProvider router={router} />
      {showUpgrade && (
        <UpgradeModal
          message={upgradeMessage}
          onClose={() => { setShowUpgrade(false); setUpgradeMessage(undefined); }}
        />
      )}
    </TenantProvider>
  );
}
