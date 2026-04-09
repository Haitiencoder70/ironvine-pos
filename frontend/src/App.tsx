import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { DashboardPage } from '@/pages/Dashboard';
import { OrdersPage } from '@/pages/Orders';
import { CustomersPage } from '@/pages/Customers';
import { InventoryPage } from '@/pages/Inventory';
import { PurchaseOrdersPage } from '@/pages/PurchaseOrders';
import { VendorsPage } from '@/pages/Vendors';
import { ShipmentsPage } from '@/pages/Shipments';
import { ReportsPage } from '@/pages/Reports';
import { SettingsPage } from '@/pages/Settings';
import { SignInPage } from '@/pages/SignIn';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />

        {/* Authenticated routes — ProtectedRoute checks Clerk auth, MainLayout provides shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/orders/*" element={<OrdersPage />} />
            <Route path="/customers/*" element={<CustomersPage />} />
            <Route path="/inventory/*" element={<InventoryPage />} />
            <Route path="/purchase-orders/*" element={<PurchaseOrdersPage />} />
            <Route path="/vendors/*" element={<VendorsPage />} />
            <Route path="/shipments/*" element={<ShipmentsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
            {/* Fallback for unknown authenticated routes */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
