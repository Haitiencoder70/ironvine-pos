import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

// Lazy-load every page bundle so only the current route's JS is downloaded
const DashboardPage    = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.DashboardPage })));
const OrdersPage       = lazy(() => import('@/pages/Orders').then(m => ({ default: m.OrdersPage })));
const CustomersPage    = lazy(() => import('@/pages/Customers').then(m => ({ default: m.CustomersPage })));
const InventoryPage    = lazy(() => import('@/pages/Inventory').then(m => ({ default: m.InventoryPage })));
const PurchaseOrdersPage = lazy(() => import('@/pages/PurchaseOrders').then(m => ({ default: m.PurchaseOrdersPage })));
const VendorsPage      = lazy(() => import('@/pages/Vendors').then(m => ({ default: m.VendorsPage })));
const ShipmentsPage    = lazy(() => import('@/pages/Shipments').then(m => ({ default: m.ShipmentsPage })));
const ReportsPageRouter  = lazy(() => import('@/pages/Reports').then(m => ({ default: m.ReportsPageRouter })));
const SettingsPageRouter = lazy(() => import('@/pages/Settings').then(m => ({ default: m.SettingsPageRouter })));
const SignInPage       = lazy(() => import('@/pages/SignIn').then(m => ({ default: m.SignInPage })));

function PageFallback(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );
}

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/sign-in/*" element={<SignInPage />} />

          {/* Authenticated routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"        element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>} />
              <Route path="/orders/*"         element={<Suspense fallback={<PageFallback />}><OrdersPage /></Suspense>} />
              <Route path="/customers/*"      element={<Suspense fallback={<PageFallback />}><CustomersPage /></Suspense>} />
              <Route path="/inventory/*"      element={<Suspense fallback={<PageFallback />}><InventoryPage /></Suspense>} />
              <Route path="/purchase-orders/*" element={<Suspense fallback={<PageFallback />}><PurchaseOrdersPage /></Suspense>} />
              <Route path="/vendors/*"        element={<Suspense fallback={<PageFallback />}><VendorsPage /></Suspense>} />
              <Route path="/shipments/*"      element={<Suspense fallback={<PageFallback />}><ShipmentsPage /></Suspense>} />
              <Route path="/reports/*"        element={<Suspense fallback={<PageFallback />}><ReportsPageRouter /></Suspense>} />
              <Route path="/settings/*"       element={<Suspense fallback={<PageFallback />}><SettingsPageRouter /></Suspense>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
