import { Routes, Route } from 'react-router-dom';
import type { JSX } from 'react';
import { OrderListPage } from './orders/OrderListPage';
import { NewOrderPage } from './orders/NewOrder';
import { OrderDetailPage } from './orders/OrderDetail';

export function OrdersPage(): JSX.Element {
  return (
    <Routes>
      <Route index element={<OrderListPage />} />
      <Route path="new" element={<NewOrderPage />} />
      <Route path=":id" element={<OrderDetailPage />} />
    </Routes>
  );
}
