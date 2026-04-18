import { ShieldCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { ROLE_PERMISSIONS, type Permission, type UserRole } from '../../lib/permissions';
import { useAuthStore } from '../../store/authStore';

// ─── Role matrix configuration ────────────────────────────────────────────────

const ROLES: UserRole[] = ['OWNER', 'MANAGER', 'STAFF'];

const ROLE_COLORS: Record<UserRole, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-gray-100 text-gray-700',
};

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: 'Orders',
    permissions: ['orders:view', 'orders:create', 'orders:edit', 'orders:delete', 'orders:approve'],
  },
  {
    label: 'Customers',
    permissions: ['customers:view', 'customers:create', 'customers:edit', 'customers:delete'],
  },
  {
    label: 'Inventory',
    permissions: ['inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete', 'inventory:adjust'],
  },
  {
    label: 'Purchase Orders',
    permissions: ['pos:view'],
  },
  {
    label: 'Users & Settings',
    permissions: ['users:view', 'settings:view'],
  },
  {
    label: 'Billing',
    permissions: ['billing:view'],
  },
  {
    label: 'Reports',
    permissions: ['reports:view'],
  },
];

function permissionLabel(p: Permission): string {
  const part = p.split(':')[1];
  return part.charAt(0).toUpperCase() + part.slice(1);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RolesPermissionsTab(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'OWNER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 bg-white rounded-2xl shadow-sm p-5">
        <ShieldCheckIcon className="h-6 w-6 text-purple-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Role Permission Matrix</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Default permissions for each role. Permissions are inherited — Owner has all Manager permissions,
            Manager has all Staff permissions.
          </p>
          {!isOwner && (
            <p className="text-xs text-amber-600 mt-1 font-medium">
              Only Owners can manage role permissions.
            </p>
          )}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">
                Permission
              </th>
              {ROLES.map((role) => (
                <th key={role} className="px-3 py-3 text-center min-w-[100px]">
                  <span
                    className={clsx(
                      'inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold',
                      ROLE_COLORS[role],
                    )}
                  >
                    {role}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <>
                {/* Group header row */}
                <tr key={`group-${group.label}`} className="bg-gray-50 border-t border-b border-gray-100">
                  <td
                    colSpan={ROLES.length + 1}
                    className="px-5 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    {group.label}
                  </td>
                </tr>

                {/* Permission rows */}
                {group.permissions.map((perm) => (
                  <tr
                    key={perm}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-0 min-h-[44px]">
                      <div className="flex items-center min-h-[44px]">
                        <span className="text-sm text-gray-700">{permissionLabel(perm)}</span>
                        <span className="ml-2 text-xs text-gray-400 font-mono">{perm}</span>
                      </div>
                    </td>
                    {ROLES.map((role) => {
                      const granted = ROLE_PERMISSIONS[role].includes(perm);
                      return (
                        <td key={role} className="px-3 text-center min-h-[44px]">
                          <div className="flex items-center justify-center min-h-[44px]">
                            {granted ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" aria-label="Granted" />
                            ) : (
                              <span className="text-gray-300 text-lg font-light select-none" aria-label="Not granted">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <span>Permission granted</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="text-gray-300 text-base font-light">—</span>
          <span>Not granted</span>
        </div>
      </div>
    </div>
  );
}
