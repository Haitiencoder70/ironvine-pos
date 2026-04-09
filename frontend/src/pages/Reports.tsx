import { Routes, Route } from 'react-router-dom';
import type { JSX } from 'react';
import { ReportsPage } from './reports/Reports';
import { SalesReportPage } from './reports/SalesReport';
import { InventoryReportPage } from './reports/InventoryReport';

export function ReportsPageRouter(): JSX.Element {
  return (
    <Routes>
      <Route index element={<ReportsPage />} />
      <Route path="sales" element={<SalesReportPage />} />
      <Route path="inventory" element={<InventoryReportPage />} />
    </Routes>
  );
}
