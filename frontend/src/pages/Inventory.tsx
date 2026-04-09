import { Routes, Route } from 'react-router-dom';
import type { JSX } from 'react';
import { InventoryListPage } from './inventory/InventoryList';
import { AddEditInventoryPage } from './inventory/AddEditInventory';
import { InventoryDetailPage } from './inventory/InventoryDetail';

export function InventoryPage(): JSX.Element {
  return (
    <Routes>
      <Route index element={<InventoryListPage />} />
      <Route path="new" element={<AddEditInventoryPage />} />
      <Route path=":id" element={<InventoryDetailPage />} />
      <Route path=":id/edit" element={<AddEditInventoryPage />} />
    </Routes>
  );
}
