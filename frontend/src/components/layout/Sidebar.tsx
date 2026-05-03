import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  UsersIcon,
  TruckIcon,
  ShoppingCartIcon,
  BuildingStorefrontIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightStartOnRectangleIcon,
  CreditCardIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useClerk } from '@clerk/clerk-react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard',    path: '/dashboard', icon: <HomeIcon className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Products',         path: '/products',         icon: <TagIcon className="h-[18px] w-[18px]" /> },
      { label: 'Orders',          path: '/orders',          icon: <ClipboardDocumentListIcon className="h-[18px] w-[18px]" /> },
      { label: 'POS Terminal',    path: '/pos',             icon: <CreditCardIcon className="h-[18px] w-[18px]" /> },
      { label: 'Inventory',       path: '/inventory',       icon: <ArchiveBoxIcon className="h-[18px] w-[18px]" /> },
      { label: 'Purchase Orders', path: '/purchase-orders', icon: <ShoppingCartIcon className="h-[18px] w-[18px]" /> },
      { label: 'Shipments',       path: '/shipments',       icon: <TruckIcon className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Customers', path: '/customers', icon: <UsersIcon className="h-[18px] w-[18px]" /> },
      { label: 'Vendors',   path: '/vendors',   icon: <BuildingStorefrontIcon className="h-[18px] w-[18px]" /> },
      { label: 'Reports',   path: '/reports',   icon: <ChartBarIcon className="h-[18px] w-[18px]" /> },
    ],
  },
  {
    items: [
      { label: 'Settings', path: '/settings', icon: <Cog6ToothIcon className="h-[18px] w-[18px]" /> },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps): React.JSX.Element {
  const { setSidebarOpen } = useUiStore();
  const { user, organization } = useAuthStore();
  const { signOut } = useClerk();
  const { canAny } = usePermissions();
  const location = useLocation();

  const handleNavClick = (): void => setSidebarOpen(false);
  const handleSignOut = (): void => { void signOut(); };

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : '';
  const roleLabel =
    user?.role === 'OWNER'   ? 'Owner'
    : user?.role === 'MANAGER' ? 'Manager'
    : 'Staff';
  const initials = user
    ? (user.firstName?.[0] ?? user.email[0]).toUpperCase()
    : '?';

  return (
    <aside
      className={clsx(
        'flex flex-col h-full relative transition-all duration-300 ease-in-out',
        'border-r border-white/[0.05]',
        collapsed ? 'w-[72px]' : 'w-[280px]'
      )}
      style={{
        background: 'linear-gradient(180deg, rgba(6,6,16,0.96) 0%, rgba(4,4,12,0.98) 100%)',
        backdropFilter: 'blur(32px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* Vertical accent gradient on right edge */}
      <div
        className="absolute inset-y-0 right-0 w-px pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.25) 35%, rgba(99,102,241,0.15) 70%, transparent 100%)',
        }}
      />

      {/* ── Brand ──────────────────────────────────────────────────────── */}
      <div className={clsx(
        'flex items-center h-[60px] border-b border-white/[0.05] flex-shrink-0',
        collapsed ? 'px-0 justify-center' : 'px-4'
      )}>
        {/* Logo mark */}
        {organization?.logoUrl ? (
          <img
            src={organization.logoUrl}
            alt={organization.name}
            className={clsx(
              'flex-shrink-0 object-contain rounded-lg bg-white',
              collapsed ? 'w-8 h-8' : 'w-8 h-8'
            )}
          />
        ) : (
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[11px] tracking-widest"
            style={{
              background: 'linear-gradient(145deg, #2563eb 0%, #1d4ed8 50%, #3730a3 100%)',
              boxShadow: '0 0 20px rgba(59,130,246,0.45), 0 0 40px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}
          >
            {organization?.name?.[0]?.toUpperCase() ?? 'PF'}
          </div>
        )}

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden ml-3 flex-1"
            >
              {organization?.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="h-7 max-w-[160px] object-contain object-left"
                />
              ) : (
                <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="font-bold text-white text-[15px] tracking-tight">
                    {organization?.name ?? 'PrintFlow'}
                  </span>
                  <span
                    className="font-light text-[13px] tracking-tight"
                    style={{
                      background: 'linear-gradient(90deg, #60a5fa, #818cf8)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    POS
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile close */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          aria-label="Close sidebar"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0">
        {navGroups.map((group, gi) => (
          <div key={gi} className={clsx(gi > 0 && 'mt-2')}>
            {/* Section label */}
            <AnimatePresence initial={false}>
              {!collapsed && group.label && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="px-3 pt-3 pb-1.5"
                >
                  <span className="section-label">{group.label}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Items */}
            <div className="space-y-0.5">
              {group.items.filter((item) => {
                if (item.path === '/reports') return canAny('reports:view');
                if (item.path === '/purchase-orders') return canAny('pos:view');
                if (item.path === '/settings') return canAny('settings:view', 'users:view', 'billing:view');
                return true;
              }).map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    title={collapsed ? item.label : undefined}
                    className={clsx('nav-item group', isActive && 'nav-item-active')}
                  >
                    {/* Icon */}
                    <span
                      className={clsx(
                        'flex-shrink-0 transition-all duration-150',
                        isActive
                          ? 'text-blue-400 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]'
                          : 'text-gray-600 group-hover:text-gray-400'
                      )}
                    >
                      {item.icon}
                    </span>

                    {/* Label */}
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden whitespace-nowrap text-[13.5px]"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Tooltip when collapsed */}
                    {collapsed && (
                      <div
                        className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-200 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50"
                        style={{
                          background: 'rgba(10,10,22,0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        }}
                      >
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Group divider — except last group */}
            {gi < navGroups.length - 2 && (
              <div className="mx-3 mt-3 border-t border-white/[0.05]" />
            )}
          </div>
        ))}
      </nav>

      {/* ── User profile ───────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-t border-white/[0.05]"
        style={{ background: 'rgba(255,255,255,0.015)' }}
      >
        <div className={clsx(
          'flex items-center gap-3 px-3 py-3',
          collapsed && 'justify-center'
        )}>
          {/* Avatar */}
          <div
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
            style={{
              background: 'linear-gradient(145deg, #2563eb, #7c3aed)',
              boxShadow: '0 0 14px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            {initials}
          </div>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden min-w-0 flex-1"
              >
                <p className="text-[13px] font-semibold text-gray-200 truncate whitespace-nowrap leading-tight">{displayName}</p>
                <p className="text-[11px] text-gray-600 whitespace-nowrap leading-tight">{roleLabel}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleSignOut}
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-700 hover:text-gray-300 hover:bg-white/5 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Sign out"
                title="Sign out"
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {collapsed && (
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-full min-h-[44px] text-gray-700 hover:text-gray-300 hover:bg-white/5 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Collapse toggle — desktop only ─────────────────────────────── */}
      <div className="hidden lg:flex flex-shrink-0 p-2 border-t border-white/[0.05]">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-full min-h-[44px] rounded-xl text-gray-700 hover:text-gray-400 hover:bg-white/5 transition-all duration-150 text-xs"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeftIcon className="h-4 w-4" />
              <span>Collapse</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
