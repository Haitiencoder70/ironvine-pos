import { UserRole } from '@prisma/client';

export type Permission =
  | 'orders:view' | 'orders:create' | 'orders:edit' | 'orders:delete' | 'orders:approve'
  | 'customers:view' | 'customers:create' | 'customers:edit' | 'customers:delete'
  | 'inventory:view' | 'inventory:create' | 'inventory:edit' | 'inventory:delete' | 'inventory:adjust'
  | 'pos:view' | 'pos:create' | 'pos:approve'
  | 'users:view' | 'users:invite' | 'users:edit' | 'users:remove'
  | 'settings:view' | 'settings:edit'
  | 'billing:view' | 'billing:edit'
  | 'reports:view' | 'reports:export'
  | 'products:view' | 'products:create' | 'products:edit' | 'products:delete'
  | 'images:upload' | 'images:delete'
  | 'dashboard:view'
  | 'catalog:search';

export const PERMISSIONS: Record<Permission, UserRole[]> = {
  'orders:view':      ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
  'orders:create':    ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'],
  'orders:edit':      ['OWNER', 'ADMIN', 'MANAGER'],
  'orders:delete':    ['OWNER', 'ADMIN'],
  'orders:approve':   ['OWNER', 'ADMIN', 'MANAGER'],
  'customers:view':   ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
  'customers:create': ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'],
  'customers:edit':   ['OWNER', 'ADMIN', 'MANAGER'],
  'customers:delete': ['OWNER', 'ADMIN'],
  'inventory:view':   ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'inventory:create': ['OWNER', 'ADMIN', 'MANAGER'],
  'inventory:edit':   ['OWNER', 'ADMIN', 'MANAGER'],
  'inventory:delete': ['OWNER', 'ADMIN'],
  'inventory:adjust': ['OWNER', 'ADMIN', 'MANAGER'],
  'pos:view':         ['OWNER', 'ADMIN', 'MANAGER'],
  'pos:create':       ['OWNER', 'ADMIN', 'MANAGER'],
  'pos:approve':      ['OWNER', 'ADMIN'],
  'users:view':       ['OWNER', 'ADMIN'],
  'users:invite':     ['OWNER', 'ADMIN'],
  'users:edit':       ['OWNER', 'ADMIN'],
  'users:remove':     ['OWNER'],
  'settings:view':    ['OWNER', 'ADMIN'],
  'settings:edit':    ['OWNER', 'ADMIN'],
  'billing:view':     ['OWNER'],
  'billing:edit':     ['OWNER'],
  'reports:view':     ['OWNER', 'ADMIN', 'MANAGER'],
  'reports:export':   ['OWNER', 'ADMIN'],
  'products:view':    ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
  'products:create':  ['OWNER', 'ADMIN', 'MANAGER'],
  'products:edit':    ['OWNER', 'ADMIN', 'MANAGER'],
  'products:delete':  ['OWNER', 'ADMIN'],
  'images:upload':    ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'],
  'images:delete':    ['OWNER', 'ADMIN', 'MANAGER'],
  'dashboard:view':   ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
  'catalog:search':   ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'VIEWER'],
};

export function hasPermission(
  role: UserRole,
  customPermissions: Record<string, boolean> | null | undefined,
  permission: Permission,
): boolean {
  // Custom permission overrides take precedence
  if (customPermissions && permission in customPermissions) {
    return customPermissions[permission] === true;
  }
  return PERMISSIONS[permission].includes(role);
}
