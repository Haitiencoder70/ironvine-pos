// ─── Permission Definitions ───────────────────────────────────────────────────
//
// Maps role → set of granted permissions.
// OWNER inherits all MANAGER permissions, MANAGER inherits all STAFF permissions.

export type Permission =
  | 'orders:create'
  | 'orders:edit'
  | 'orders:delete'
  | 'orders:approve'
  | 'orders:view'
  | 'customers:create'
  | 'customers:edit'
  | 'customers:delete'
  | 'customers:view'
  | 'inventory:create'
  | 'inventory:edit'
  | 'inventory:delete'
  | 'inventory:adjust'
  | 'inventory:view'
  | 'reports:view'
  | 'pos:view'
  | 'settings:view'
  | 'users:view'
  | 'billing:view';

export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF';

const STAFF_PERMISSIONS: Permission[] = [
  'orders:create',
  'orders:edit',
  'orders:view',
  'customers:create',
  'customers:edit',
  'customers:view',
  'inventory:view',
  'inventory:adjust',
  'pos:view',
];

const MANAGER_PERMISSIONS: Permission[] = [
  ...STAFF_PERMISSIONS,
  'orders:delete',
  'orders:approve',
  'customers:delete',
  'inventory:create',
  'inventory:edit',
  'inventory:delete',
  'reports:view',
  'settings:view',
  'users:view',
];

const OWNER_PERMISSIONS: Permission[] = [
  ...MANAGER_PERMISSIONS,
  'billing:view',
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  STAFF: STAFF_PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
  OWNER: OWNER_PERMISSIONS,
};
