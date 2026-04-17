import { Bars3Icon, SignalSlashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { UserButton, OrganizationSwitcher, useOrganization } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import { useOfflineStore } from '../../store/offlineStore';

const routeLabels: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/orders':          'Orders',
  '/orders/new':      'New Order',
  '/inventory':       'Inventory',
  '/customers':       'Customers',
  '/purchase-orders': 'Purchase Orders',
  '/vendors':         'Vendors',
  '/shipments':       'Shipments',
  '/reports':         'Reports',
  '/settings':        'Settings',
  '/pos':             'POS Terminal',
};

function getBreadcrumb(pathname: string): string {
  if (pathname.startsWith('/orders/new'))                              return 'New Order';
  if (pathname.startsWith('/orders/') && pathname !== '/orders')       return 'Order Detail';
  if (pathname.startsWith('/customers/') && pathname !== '/customers') return 'Customer Detail';
  if (pathname.startsWith('/inventory/') && pathname !== '/inventory') return 'Inventory Item';
  if (pathname.startsWith('/purchase-orders/') && pathname !== '/purchase-orders') return 'PO Detail';
  if (pathname.startsWith('/shipments/') && pathname !== '/shipments') return 'Shipment Detail';
  if (pathname.startsWith('/pos'))                                     return 'POS Terminal';
  return routeLabels[pathname] ?? '';
}

export function TopBar(): React.JSX.Element {
  const { setSidebarOpen } = useUiStore();
  const { isOnline, isBackendReachable } = useOfflineStore();
  const effectivelyOffline = !isOnline || !isBackendReachable;
  const { organization } = useOrganization();
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = getBreadcrumb(location.pathname);

  return (
    <header
      className="h-[56px] flex items-center gap-3 px-4 flex-shrink-0 z-20 border-b border-white/[0.05]"
      style={{
        background: 'linear-gradient(180deg, rgba(8,8,18,0.92) 0%, rgba(5,5,14,0.95) 100%)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* Mobile menu */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 rounded-xl text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Open navigation"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Page title + org */}
      <div className="flex-1 min-w-0">
        <h1
          className="text-[14px] font-bold truncate tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #f0f2f8 0%, #a8b4cc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {pageTitle}
        </h1>
        {organization && (
          <p className="text-[11px] text-gray-700 -mt-0.5 truncate font-medium tracking-wide">
            {organization.name}
          </p>
        )}
      </div>

      {/* Offline badge */}
      {effectivelyOffline && (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            boxShadow: '0 0 16px rgba(245,158,11,0.1)',
          }}
        >
          <SignalSlashIcon className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400 hidden sm:inline tracking-wide">Offline</span>
        </div>
      )}

      {/* New Order CTA */}
      <button
        onClick={() => void navigate('/orders/new')}
        className="flex items-center gap-2 min-h-[36px] px-4 text-[13px] font-bold rounded-xl transition-all duration-150 flex-shrink-0 text-white active:scale-[0.97]"
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 60%, #1d4ed8 100%)',
          boxShadow: '0 0 20px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.2)',
        }}
        aria-label="Create new order"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">New Order</span>
      </button>

      {/* Org switcher — always visible so you can switch/activate an org */}
      <OrganizationSwitcher
        hidePersonal
        appearance={{
          elements: {
            rootBox: 'flex items-center',
            organizationSwitcherTrigger:
              'flex items-center gap-2 px-3 min-h-[36px] rounded-xl text-[13px] font-medium text-gray-300 hover:bg-white/5 transition-colors border border-white/10',
            organizationPreviewTextContainer: 'hidden sm:flex',
          },
        }}
      />

      {/* Clerk user avatar */}
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'w-7 h-7 ring-1 ring-white/10 shadow-[0_0_12px_rgba(59,130,246,0.2)]',
          },
        }}
      />
    </header>
  );
}
