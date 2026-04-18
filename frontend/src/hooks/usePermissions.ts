import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { ROLE_PERMISSIONS, type Permission, type UserRole } from '../lib/permissions';

interface UsePermissionsResult {
  /** Returns true if the current user has the given permission. */
  can: (permission: Permission) => boolean;
  /** Returns true if the current user has ANY of the given permissions. */
  canAny: (...permissions: Permission[]) => boolean;
  /** Returns true if the current user has ALL of the given permissions. */
  canAll: (...permissions: Permission[]) => boolean;
}

export function usePermissions(): UsePermissionsResult {
  const user = useAuthStore((s) => s.user);

  const getGranted = useCallback((): Set<Permission> => {
    if (!user) return new Set();
    const role = user.role as UserRole;
    const perms = ROLE_PERMISSIONS[role] ?? [];
    return new Set(perms);
  }, [user]);

  const can = useCallback(
    (permission: Permission): boolean => getGranted().has(permission),
    [getGranted]
  );

  const canAny = useCallback(
    (...permissions: Permission[]): boolean => {
      const granted = getGranted();
      return permissions.some((p) => granted.has(p));
    },
    [getGranted]
  );

  const canAll = useCallback(
    (...permissions: Permission[]): boolean => {
      const granted = getGranted();
      return permissions.every((p) => granted.has(p));
    },
    [getGranted]
  );

  return { can, canAny, canAll };
}
