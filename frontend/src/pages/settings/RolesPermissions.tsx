import { ShieldCheckIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { PERMISSIONS, type Permission, type UserRole } from '../../lib/permissions';
import { useAuthStore } from '../../store/authStore';
import { settingsApi, type AuditLogEntry } from '../../lib/api';
import { usePermissions } from '../../hooks/usePermissions';

// ─── Role matrix configuration ────────────────────────────────────────────────

const ROLES: UserRole[] = ['OWNER', 'MANAGER', 'STAFF'];

const ROLE_COLORS: Record<UserRole, string> = {
  OWNER: 'bg-purple-500/15 text-purple-300',
  ADMIN: 'bg-indigo-500/15 text-indigo-300',
  MANAGER: 'bg-blue-500/15 text-blue-300',
  STAFF: 'bg-slate-500/15 text-slate-300',
  VIEWER: 'bg-green-500/15 text-green-300',
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// ─── Audit Log Section ────────────────────────────────────────────────────────

function AuditLogSection(): React.JSX.Element {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-log', 'permission-denials'],
    queryFn: () => settingsApi.getAuditLog(1, 20),
  });

  if (isLoading) {
    return (
      <div className="card-cinema rounded-2xl p-6 text-sm text-slate-400 text-center">
        Loading audit log...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card-cinema rounded-2xl p-6 text-sm text-red-400 text-center">
        Failed to load audit log.
      </div>
    );
  }

  const entries: AuditLogEntry[] = data?.data ?? [];

  return (
    <div className="card-cinema rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-100">Permission Audit Log</p>
          <p className="text-xs text-slate-500 mt-0.5">Last 20 permission denial events for your organization.</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="px-5 py-8 text-sm text-slate-500 text-center">No permission denials recorded</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/[0.06]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Permissions Attempted</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Path</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const meta = entry.metadata as { permissions?: string[]; role?: string; path?: string; method?: string } | null;
                return (
                  <tr key={entry.id} className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{timeAgo(entry.createdAt)}</td>
                    <td className="px-5 py-3 text-xs text-slate-300 font-mono truncate max-w-[120px]">{entry.performedBy}</td>
                    <td className="px-5 py-3 text-xs text-slate-300 font-mono">{entry.entityId}</td>
                    <td className="px-5 py-3 text-xs text-slate-300 font-mono">
                      {meta?.method && <span className="text-slate-500 mr-1">{meta.method}</span>}
                      {meta?.path ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/[0.06] text-slate-300">
                        {meta?.role ?? '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RolesPermissionsTab(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'OWNER';
  const { can } = usePermissions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 card-cinema rounded-2xl p-5">
        <ShieldCheckIcon className="h-6 w-6 text-purple-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-slate-100">Role Permission Matrix</p>
          <p className="text-xs text-slate-500 mt-0.5">
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
      <div className="card-cinema rounded-xl overflow-x-auto overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-48">
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
                <tr key={`group-${group.label}`} className="bg-white/[0.06] border-t border-b border-white/[0.06]">
                  <td
                    colSpan={ROLES.length + 1}
                    className="px-5 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider"
                  >
                    {group.label}
                  </td>
                </tr>

                {/* Permission rows */}
                {group.permissions.map((perm) => (
                  <tr
                    key={perm}
                    className="border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-5 py-0 min-h-[44px]">
                      <div className="flex items-center min-h-[44px]">
                        <span className="text-sm text-slate-300">{permissionLabel(perm)}</span>
                        <span className="ml-2 text-xs text-slate-500 font-mono">{perm}</span>
                      </div>
                    </td>
                    {ROLES.map((role) => {
                      const granted = PERMISSIONS[perm]?.includes(role) ?? false;
                      return (
                        <td key={role} className="px-3 text-center min-h-[44px]">
                          <div className="flex items-center justify-center min-h-[44px]">
                            {granted ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-500" aria-label="Granted" />
                            ) : (
                              <span className="text-slate-600 text-lg font-light select-none" aria-label="Not granted">
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
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <span>Permission granted</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-slate-600 text-base font-light">—</span>
          <span>Not granted</span>
        </div>
      </div>

      {/* Permission Audit Log */}
      {can('settings:view') && <AuditLogSection />}
    </div>
  );
}
