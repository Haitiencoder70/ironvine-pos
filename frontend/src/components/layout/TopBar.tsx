import { Bars3Icon, WifiIcon, PlusIcon } from '@heroicons/react/24/outline';
import { UserButton, useOrganization } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import { useOfflineStore } from '../../store/offlineStore';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/orders/new': 'New Order',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/purchase-orders': 'Purchase Orders',
  '/vendors': 'Vendors',
  '/shipments': 'Shipments',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

function getBreadcrumb(pathname: string): string {
  if (pathname.startsWith('/orders/new')) return 'New Order';
  if (pathname.startsWith('/orders/') && pathname !== '/orders') return 'Order Detail';
  if (pathname.startsWith('/customers/') && pathname !== '/customers') return 'Customer Detail';
  if (pathname.startsWith('/inventory/') && pathname !== '/inventory') return 'Inventory Item';
  if (pathname.startsWith('/purchase-orders/') && pathname !== '/purchase-orders') return 'Purchase Order Detail';
  if (pathname.startsWith('/shipments/') && pathname !== '/shipments') return 'Shipment Detail';
  return routeLabels[pathname] ?? '';
}

export function TopBar(): React.JSX.Element {
  const { setSidebarOpen } = useUiStore();
  const { isOnline } = useOfflineStore();
  const { organization } = useOrganization();
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = getBreadcrumb(location.pathname);

  const handleNewOrder = (): void => {
    void navigate('/orders/new');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-3 px-4 flex-shrink-0 z-20">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Open navigation"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-gray-900 truncate">{pageTitle}</h1>
        {organization && (
          <p className="text-xs text-gray-400 -mt-0.5 truncate">{organization.name}</p>
        )}
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full flex-shrink-0">
          <WifiIcon className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-medium text-amber-700 hidden sm:inline">Offline</span>
        </div>
      )}

      {/* New Order quick action */}
      <button
        onClick={handleNewOrder}
        className="flex items-center gap-2 min-h-[44px] px-4 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors flex-shrink-0"
        aria-label="Create new order"
      >
        <PlusIcon className="h-4 w-4" />
        <span className="hidden sm:inline">New Order</span>
      </button>

      {/* User */}
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-9 h-9',
          },
        }}
      />
    </header>
  );
}
