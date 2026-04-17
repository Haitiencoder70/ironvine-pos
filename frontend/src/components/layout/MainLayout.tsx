import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SocketInit } from './SocketInit';
import { BottomNav } from '../mobile/BottomNav';
import { Omnibar } from '../ui/Omnibar';
import { useUiStore } from '../../store/uiStore';
import { useSwipeBack } from '../../hooks/useSwipeBack';

export function MainLayout(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const { isSidebarOpen, setSidebarOpen } = useUiStore();
  const location = useLocation();

  // Auto-close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  // Swipe from left edge to go back on mobile
  useSwipeBack();

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <SocketInit />
      <Omnibar />

      {/* ── Desktop sidebar (always in DOM, width animated) ── */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      </div>

      {/* ── Mobile/Tablet sidebar overlay ── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
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
        {/* TopBar: hide hamburger on desktop since sidebar is always visible */}
        <TopBar />

        {/* Scrollable page content — extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <BottomNav />
    </div>
  );
}
