import { Routes, Route } from 'react-router-dom';
import type { JSX } from 'react';
import { CustomerListPage } from './customers/CustomerList';
import { CustomerDetailPage } from './customers/CustomerDetail';
import { AddEditCustomerPage } from './customers/AddEditCustomer';

export function CustomersPage(): JSX.Element {
  return (
    <Routes>
      <Route index element={<CustomerListPage />} />
      <Route path="new" element={<AddEditCustomerPage />} />
      <Route path=":id" element={<CustomerDetailPage />} />
      <Route path=":id/edit" element={<AddEditCustomerPage />} />
    </Routes>
  );
}
