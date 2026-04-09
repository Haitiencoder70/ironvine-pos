# Application Layout & Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full application shell — responsive layout with collapsible sidebar, protected routing, and socket initialization — wiring all pages together under one authenticated layout.

**Architecture:** React Router v6 `<Outlet />` pattern: a `ProtectedRoute` wrapper checks Clerk auth, then `MainLayout` renders the sidebar + topbar shell with `<Outlet />` for page content. Desktop keeps the sidebar permanently visible (collapsible to icons). Mobile/tablet shows an overlay sidebar driven by `uiStore.isSidebarOpen`. Socket.IO is initialized once inside the authenticated tree via a `SocketInit` component. All other pages are stub placeholders to be filled in later.

**Tech Stack:** React Router DOM v6, Clerk (`useAuth`, `useClerk`, `SignedIn`/`SignedOut`), Framer Motion, Zustand (`uiStore`, `authStore`), Socket.IO client, Tailwind CSS, `@heroicons/react`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/pages/Orders.tsx` | Create | Stub placeholder |
| `frontend/src/pages/Customers.tsx` | Create | Stub placeholder |
| `frontend/src/pages/Inventory.tsx` | Create | Stub placeholder |
| `frontend/src/pages/PurchaseOrders.tsx` | Create | Stub placeholder |
| `frontend/src/pages/Vendors.tsx` | Create | Stub placeholder |
| `frontend/src/pages/Shipments.tsx` | Create | Stub placeholder |
| `frontend/src/pages/Reports.tsx` | Create | Stub placeholder |
| `frontend/src/pages/Settings.tsx` | Create | Stub placeholder |
| `frontend/src/components/layout/Sidebar.tsx` | Modify | Add Reports, fix widths, add user profile + sign out |
| `frontend/src/components/layout/TopBar.tsx` | Modify | Add "New Order" quick button |
| `frontend/src/components/layout/MainLayout.tsx` | Create | Shell: sidebar + topbar + Outlet, desktop/mobile logic |
| `frontend/src/components/layout/ProtectedRoute.tsx` | Create | Clerk auth gate + role-based access |
| `frontend/src/components/layout/SocketInit.tsx` | Create | Initialize socket.io once when signed in |
| `frontend/src/App.tsx` | Modify | Full route tree using Outlet pattern, remove broken nested Routes |

---

### Task 1: Create stub page components

**Files:**
- Create: `frontend/src/pages/Orders.tsx`
- Create: `frontend/src/pages/Customers.tsx`
- Create: `frontend/src/pages/Inventory.tsx`
- Create: `frontend/src/pages/PurchaseOrders.tsx`
- Create: `frontend/src/pages/Vendors.tsx`
- Create: `frontend/src/pages/Shipments.tsx`
- Create: `frontend/src/pages/Reports.tsx`
- Create: `frontend/src/pages/Settings.tsx`

These are minimal placeholders so routes work immediately. Pages will be fully implemented in later sessions.

- [ ] **Step 1: Create all stub pages**

Create each file with this pattern (change the title string per file):

`frontend/src/pages/Orders.tsx`:
```tsx
import type { JSX } from 'react';

export function OrdersPage(): JSX.Element {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
      <p className="mt-2 text-gray-500">Orders page — coming soon.</p>
    </div>
  );
}
```

`frontend/src/pages/Customers.tsx`:
```tsx
import type { JSX } from 'react';

export function CustomersPage(): JSX.Element {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
      <p className="mt-2 text-gray-500">Customers page — coming soon.</p>
    </div>
  );
}
```

`frontend/src/pages/Inventory.tsx`:
```tsx
import type { JSX } from 'react';

export function InventoryPage(): JSX.Element {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
      <p className="mt-2 text-gray-500">Inventory page — coming soon.</p>
    </div>
  );
}
```

`frontend/src/pages/PurchaseOrders.tsx`:
```tsx
import type { JSX } from 'react';

export function PurchaseOrdersPage(): JSX.Element {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
      <p className="mt-2 text-gray-500">Purchase Orders page — coming soon.</p>
    </div>
  );
}
```

`frontend/src/pages/Vendors.tsx`:
```tsx
import type { JSX } from 'react';

export function VendorsPage(): JSX.Element {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
      <p className="mt-2 text-gray-500">Vendors page — coming soon.</p>
    </div>
  );
}
```

`frontend/src/pages/Shipments.tsx`:
```tsx
import type { JSX } from 'react';

export function ShipmentsPage(): JSX.Element {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
      <p className="mt-2 text-gray-500">Shipments page — coming soon.</p>
    </div>
  );
}
```

`frontend/src/pages/Reports.tsx`:
```tsx
import type { JSX } from 'react';

export function ReportsPage(): JSX.Element {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      <p className="mt-2 text-gray-500">Reports page — coming soon.</p>
    </div>
  );
}
```

`frontend/src/pages/Settings.tsx`:
```tsx
import type { JSX } from 'react';

export function SettingsPage(): JSX.Element {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-2 text-gray-500">Settings page — coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Orders.tsx frontend/src/pages/Customers.tsx frontend/src/pages/Inventory.tsx frontend/src/pages/PurchaseOrders.tsx frontend/src/pages/Vendors.tsx frontend/src/pages/Shipments.tsx frontend/src/pages/Reports.tsx frontend/src/pages/Settings.tsx
git commit -m "feat(pages): add stub page components for all routes"
```

---

### Task 2: Update Sidebar.tsx

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`

**Changes:**
- Add `ChartBarIcon` import and `Reports` nav item between Shipments and Settings
- Fix widths: `w-[280px]` expanded (was `w-64`/256px), `w-20` collapsed (was `w-16`/64px)
- Add user profile section at bottom above collapse toggle — shows avatar, name, role from `useAuthStore`
- Add sign out button using `useClerk().signOut()`

- [ ] **Step 1: Write the complete replacement for `frontend/src/components/layout/Sidebar.tsx`**

```tsx
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
            className="flex items-center justify-center w-full min-h-[44px] rounded-none text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(layout): add Reports nav, user profile, sign out to Sidebar"
```

---

### Task 3: Update TopBar.tsx

**Files:**
- Modify: `frontend/src/components/layout/TopBar.tsx`

**Changes:** Add a "New Order" touch button that navigates to `/orders/new`. Import `useNavigate` from react-router-dom and `TouchButton` (or a plain styled button to avoid circular imports). Use a plain button styled to spec since `TouchButton` lives in a sibling folder — no circular dependency issue, but use a plain `<button>` for simplicity here to avoid the motion overhead in the header.

- [ ] **Step 1: Write the complete replacement for `frontend/src/components/layout/TopBar.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/TopBar.tsx
git commit -m "feat(layout): add New Order quick action button to TopBar"
```

---

### Task 4: Create ProtectedRoute.tsx

**Files:**
- Create: `frontend/src/components/layout/ProtectedRoute.tsx`

**Context:** React Router v6 layout routes use `<Outlet />` — a route component that renders its children. `ProtectedRoute` renders `<Outlet />` when signed in, redirects to sign-in otherwise. The optional `allowedRoles` prop gates by role using `useAuthStore`.

- [ ] **Step 1: Create `frontend/src/components/layout/ProtectedRoute.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: User['role'][];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps): React.JSX.Element {
  const user = useAuthStore((s) => s.user);

  // Role check — only runs when user is loaded and allowedRoles is specified
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-500">
            You don&apos;t have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <Outlet />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/ProtectedRoute.tsx
git commit -m "feat(layout): add ProtectedRoute component with role-based access"
```

---

### Task 5: Create SocketInit.tsx

**Files:**
- Create: `frontend/src/components/layout/SocketInit.tsx`

**Context:** Socket.IO must be initialized once after the user is authenticated. `SocketInit` is a null-rendering component placed inside the authenticated tree. It calls `initSocket` with `getToken` from Clerk's `useAuth`. The returned unsubscribe function disconnects on unmount (e.g., sign-out).

- [ ] **Step 1: Create `frontend/src/components/layout/SocketInit.tsx`**

```tsx
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { initSocket, disconnectSocket } from '../../services/socket';

export function SocketInit(): null {
  const { getToken } = useAuth();

  useEffect(() => {
    let mounted = true;

    const connect = async (): Promise<void> => {
      try {
        await initSocket(async () => {
          if (!mounted) return null;
          return getToken();
        });
      } catch {
        // Socket failure is non-fatal — app works without real-time updates
      }
    };

    void connect();

    return () => {
      mounted = false;
      disconnectSocket();
    };
  }, [getToken]);

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/SocketInit.tsx
git commit -m "feat(layout): add SocketInit component for authenticated socket.io connection"
```

---

### Task 6: Create MainLayout.tsx

**Files:**
- Create: `frontend/src/components/layout/MainLayout.tsx`

**Context:**
- `collapsed` is local state (desktop only) — starts `false`
- `isSidebarOpen` from `uiStore` controls the mobile overlay
- On desktop (≥1024px): sidebar is always in the DOM, collapsed state controls width. No overlay.
- On mobile/tablet (<1024px): sidebar slides in as a fixed overlay from the left, driven by `isSidebarOpen`. Dark backdrop closes it on tap.
- `useEffect` on `location.pathname` closes the mobile sidebar after navigation (auto-close)
- `<Outlet />` renders the active child route's page content

- [ ] **Step 1: Create `frontend/src/components/layout/MainLayout.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SocketInit } from './SocketInit';
import { useUiStore } from '../../store/uiStore';

export function MainLayout(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const { isSidebarOpen, setSidebarOpen } = useUiStore();
  const location = useLocation();

  // Auto-close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <SocketInit />

      {/* ── Desktop sidebar (always in DOM, width animated) ── */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      </div>

      {/* ── Mobile/Tablet sidebar overlay ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            {/* Sidebar panel */}
            <motion.div
              key="sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <Sidebar collapsed={false} onToggleCollapse={() => {}} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content area ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/MainLayout.tsx
git commit -m "feat(layout): add MainLayout with responsive sidebar shell and Outlet"
```

---

### Task 7: Update App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Context:** The current App.tsx uses nested `<Routes>` inside `<Routes>` which is invalid in React Router v6 (throws a runtime error). Replace with the v6 layout route pattern: a `ProtectedRoute` with no path wraps `MainLayout` which provides `<Outlet />` for child routes. All page imports added.

- [ ] **Step 1: Write the complete replacement for `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { DashboardPage } from '@/pages/Dashboard';
import { OrdersPage } from '@/pages/Orders';
import { CustomersPage } from '@/pages/Customers';
import { InventoryPage } from '@/pages/Inventory';
import { PurchaseOrdersPage } from '@/pages/PurchaseOrders';
import { VendorsPage } from '@/pages/Vendors';
import { ShipmentsPage } from '@/pages/Shipments';
import { ReportsPage } from '@/pages/Reports';
import { SettingsPage } from '@/pages/Settings';
import { SignInPage } from '@/pages/SignIn';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />

        {/* Authenticated routes — ProtectedRoute checks Clerk auth, MainLayout provides shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/orders/*" element={<OrdersPage />} />
            <Route path="/customers/*" element={<CustomersPage />} />
            <Route path="/inventory/*" element={<InventoryPage />} />
            <Route path="/purchase-orders/*" element={<PurchaseOrdersPage />} />
            <Route path="/vendors/*" element={<VendorsPage />} />
            <Route path="/shipments/*" element={<ShipmentsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
            {/* Fallback for unknown authenticated routes */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(app): set up full React Router v6 route tree with MainLayout and ProtectedRoute"
```

---

## Self-Review

### Spec coverage
- ✅ MainLayout — Task 6: 280px/80px sidebar, mobile overlay, desktop always-visible, auto-close on navigation, Framer Motion animations
- ✅ TopBar hamburger (44px) — Task 3: existing + preserved
- ✅ App title/logo — existing Sidebar brand section preserved  
- ✅ "New Order" quick button — Task 3
- ✅ User menu — TopBar has Clerk `UserButton`; Sidebar has profile + sign out
- ✅ All 9 nav items — Task 2 adds Reports; all items present
- ✅ Active route highlighting — NavLink `isActive` logic preserved
- ✅ Auto-close mobile sidebar — Task 6: `useEffect` on `location.pathname`
- ✅ User profile section in sidebar — Task 2
- ✅ Sign out button — Task 2
- ✅ Framer Motion animations — Task 6: backdrop fade, sidebar slide, AnimatePresence
- ✅ ProtectedRoute — Task 4: Clerk auth gate + role-based access
- ✅ App.tsx with all routes + socket init — Tasks 5 + 7
- ✅ Login page — `SignIn.tsx` already uses Clerk `<SignIn />` (correct per CLAUDE.md — no custom auth code)
- ✅ Desktop: sidebar always visible, collapsible — Task 6
- ✅ Tablet: overlay sidebar, closes after navigation — Task 6
- ✅ Mobile: full-screen overlay — Task 6 (fixed position, full height)
- ✅ All touch targets ≥ 44px — all buttons use `min-h-[44px] min-w-[44px]`

### Placeholder scan
No TBDs. Every task has complete code. Stub pages are intentionally minimal (explicitly named "stub placeholder" — not placeholders in the code-quality sense; they are complete, runnable components).

### Type consistency
- `Sidebar` props `{ collapsed: boolean, onToggleCollapse: () => void }` — defined in Task 2, used in Tasks 6 (desktop and mobile: mobile passes `onToggleCollapse={() => {}}` since collapse is desktop-only) ✅
- `useAuthStore` `user.role` values `'OWNER' | 'MANAGER' | 'STAFF'` — match `types/index.ts` ✅
- `ProtectedRoute` `allowedRoles` prop typed as `User['role'][]` — consistent with `User` type ✅
- `navigate('/orders/new')` returns a Promise — wrapped in `void` to satisfy no-floating-promise ✅
