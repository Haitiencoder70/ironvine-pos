import { useAuthStore } from '../store/authStore';
import { checkPermission, Permission } from '../lib/permissions';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const can = (permission: Permission): boolean => {
    if (!user) return false;
    return checkPermission(user.role, user.customPermissions ?? null, permission);
  };

  const canAny = (...permissions: Permission[]): boolean =>
    permissions.some((p) => can(p));

  const canAll = (...permissions: Permission[]): boolean =>
    permissions.every((p) => can(p));

  return { can, canAny, canAll };
}
