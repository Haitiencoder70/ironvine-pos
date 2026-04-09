import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  UsersIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ClipboardDocumentListIcon as OrdersIconSolid,
  ArchiveBoxIcon as InventoryIconSolid,
  UsersIcon as UsersIconSolid,
  Cog6ToothIcon as SettingsIconSolid,
} from '@heroicons/react/24/solid';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Home',      icon: HomeIcon,                    activeIcon: HomeIconSolid },
  { path: '/orders',     label: 'Orders',    icon: ClipboardDocumentListIcon,   activeIcon: OrdersIconSolid },
  { path: '/inventory',  label: 'Inventory', icon: ArchiveBoxIcon,              activeIcon: InventoryIconSolid },
  { path: '/customers',  label: 'Customers', icon: UsersIcon,                   activeIcon: UsersIconSolid },
  { path: '/settings',   label: 'Settings',  icon: Cog6ToothIcon,               activeIcon: SettingsIconSolid },
];

export function BottomNav(): React.JSX.Element {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-bottom lg:hidden">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ path, label, icon: Icon, activeIcon: ActiveIcon }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 gap-0.5 min-h-[44px] transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700',
              )}
              aria-label={label}
            >
              {isActive
                ? <ActiveIcon className="h-6 w-6" />
                : <Icon className="h-6 w-6" />}
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
