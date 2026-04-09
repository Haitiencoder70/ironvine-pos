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
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useClerk } from '@clerk/clerk-react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <HomeIcon className="h-5 w-5" /> },
  { label: 'Orders', path: '/orders', icon: <ClipboardDocumentListIcon className="h-5 w-5" /> },
  { label: 'Inventory', path: '/inventory', icon: <ArchiveBoxIcon className="h-5 w-5" /> },
  { label: 'Customers', path: '/customers', icon: <UsersIcon className="h-5 w-5" /> },
  { label: 'Purchase Orders', path: '/purchase-orders', icon: <ShoppingCartIcon className="h-5 w-5" /> },
  { label: 'Vendors', path: '/vendors', icon: <BuildingStorefrontIcon className="h-5 w-5" /> },
  { label: 'Shipments', path: '/shipments', icon: <TruckIcon className="h-5 w-5" /> },
  { label: 'Reports', path: '/reports', icon: <ChartBarIcon className="h-5 w-5" /> },
  { label: 'Settings', path: '/settings', icon: <Cog6ToothIcon className="h-5 w-5" /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps): React.JSX.Element {
  const { setSidebarOpen } = useUiStore();
  const { user } = useAuthStore();
  const { signOut } = useClerk();
  const location = useLocation();

  const handleNavClick = (): void => {
    setSidebarOpen(false);
  };

  const handleSignOut = (): void => {
    void signOut();
  };

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : '';
  const roleLabel =
    user?.role === 'OWNER' ? 'Owner'
    : user?.role === 'MANAGER' ? 'Manager'
    : 'Staff';

  return (
    <aside
      className={clsx(
        'flex flex-col h-full bg-gray-900 text-white transition-all duration-300 ease-in-out relative',
        collapsed ? 'w-20' : 'w-[280px]'
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center h-16 px-4 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">IV</span>
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <span className="font-bold text-white whitespace-nowrap text-base">
                  IronVine POS
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto lg:hidden p-1 rounded-md hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          aria-label="Close sidebar"
        >
          <XMarkIcon className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              title={collapsed ? item.label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-3 rounded-xl min-h-[44px] transition-all duration-150 group relative',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap font-medium text-sm"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {/* Tooltip when collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="flex-shrink-0 border-t border-gray-700/50">
        <div
          className={clsx(
            'flex items-center gap-3 px-3 py-3',
            collapsed && 'justify-center'
          )}
        >
          {/* Avatar initials */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
            {user ? (user.firstName?.[0] ?? user.email[0]).toUpperCase() : '?'}
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
                <p className="text-sm font-medium text-white truncate whitespace-nowrap">
                  {displayName}
                </p>
                <p className="text-xs text-gray-400 whitespace-nowrap">{roleLabel}</p>
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
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Sign out"
                title="Sign out"
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Collapsed sign-out */}
        {collapsed && (
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-full min-h-[44px] text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapse toggle — desktop only */}
      <div className="hidden lg:flex flex-shrink-0 p-2 border-t border-gray-700/50">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-full min-h-[44px] rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <ChevronLeftIcon className="h-5 w-5" />
              <span>Collapse</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
