import { Routes, Route } from 'react-router-dom';
import type { JSX } from 'react';
import { PurchaseOrderListPage } from './purchase-orders/PurchaseOrderList';
import { CreatePOPage } from './purchase-orders/CreatePOForOrder';
import { PurchaseOrderDetailPage } from './purchase-orders/PurchaseOrderDetail';

export function PurchaseOrdersPage(): JSX.Element {
  return (
    <Routes>
      <Route index element={<PurchaseOrderListPage />} />
      <Route path="new" element={<CreatePOPage />} />
      <Route path=":id" element={<PurchaseOrderDetailPage />} />
    </Routes>
  );
}
