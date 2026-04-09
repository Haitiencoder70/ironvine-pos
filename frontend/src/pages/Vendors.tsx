import { Routes, Route } from 'react-router-dom';
import type { JSX } from 'react';
import { VendorListPage } from './vendors/VendorList';
import { VendorDetailPage } from './vendors/VendorDetail';
import { AddEditVendorPage } from './vendors/AddEditVendor';

export function VendorsPage(): JSX.Element {
  return (
    <Routes>
      <Route index element={<VendorListPage />} />
      <Route path="new" element={<AddEditVendorPage />} />
      <Route path=":id" element={<VendorDetailPage />} />
      <Route path=":id/edit" element={<AddEditVendorPage />} />
    </Routes>
  );
}
