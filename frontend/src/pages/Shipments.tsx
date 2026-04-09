import { Routes, Route } from 'react-router-dom';
import type { JSX } from 'react';
import { ShipmentListPage } from './shipments/ShipmentList';
import { ShipmentDetailPage } from './shipments/ShipmentDetail';

export function ShipmentsPage(): JSX.Element {
  return (
    <Routes>
      <Route index element={<ShipmentListPage />} />
      <Route path=":id" element={<ShipmentDetailPage />} />
    </Routes>
  );
}
