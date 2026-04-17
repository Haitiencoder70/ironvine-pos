import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ArchiveBoxIcon,
  UsersIcon,
  CreditCardIcon as POSIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ClipboardDocumentListIcon as OrdersIconSolid,
  ArchiveBoxIcon as InventoryIconSolid,
  UsersIcon as UsersIconSolid,
  CreditCardIcon as POSIconSolid,
} from '@heroicons/react/24/solid';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Home',      icon: HomeIcon,                  activeIcon: HomeIconSolid },
  { path: '/orders',     label: 'Orders',    icon: ClipboardDocumentListIcon, activeIcon: OrdersIconSolid },
  { path: '/pos',        label: 'POS',       icon: POSIcon,                   activeIcon: POSIconSolid },
  { path: '/inventory',  label: 'Stock',     icon: ArchiveBoxIcon,            activeIcon: InventoryIconSolid },
  { path: '/customers',  label: 'Customers', icon: UsersIcon,                 activeIcon: UsersIconSolid },
];

export function BottomNav(): React.JSX.Element {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 safe-area-bottom lg:hidden border-t border-white/[0.07]"
      style={{
        backdropFilter: 'blur(28px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.6)',
        backgroundColor: 'rgba(5, 5, 8, 0.92)',
      }}
    >
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ path, label, icon: Icon, activeIcon: ActiveIcon }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={clsx(
                'flex flex-col items-center justify-center flex-1 gap-0.5 min-h-[44px] transition-colors duration-150 relative',
                isActive ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400',
              )}
              aria-label={label}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
                    boxShadow: '0 0 8px rgba(59,130,246,0.7)',
                  }}
                />
              )}
              {isActive
                ? <ActiveIcon className="h-[22px] w-[22px]" />
                : <Icon className="h-[22px] w-[22px]" />}
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
