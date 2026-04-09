import { Routes, Route } from 'react-router-dom';
import type { JSX } from 'react';
import { SettingsPage } from './settings/Settings';
import { AddEditUserPage } from './settings/AddEditUser';
import { ProfilePage } from './settings/Profile';

export function SettingsPageRouter(): JSX.Element {
  return (
    <Routes>
      <Route index element={<SettingsPage />} />
      <Route path="users/new" element={<AddEditUserPage />} />
      <Route path="users/:id" element={<AddEditUserPage />} />
      <Route path="profile" element={<ProfilePage />} />
    </Routes>
  );
}
