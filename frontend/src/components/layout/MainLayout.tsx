import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowsPointingInIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SocketInit } from './SocketInit';
import { BottomNav } from '../mobile/BottomNav';
import { Omnibar } from '../ui/Omnibar';
import { OfflineBanner } from '../ui/OfflineBanner';
import { PlanLimitBanner } from '../PlanLimitBanner';
import { TrialBanner } from '../TrialBanner';
import { UpgradeModal } from '../UpgradeModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useUiStore } from '../../store/uiStore';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import { useQueryClient } from '@tanstack/react-query';

export function MainLayout(): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const { isSidebarOpen, setSidebarOpen, isFocusMode, enterFocusMode, exitFocusMode } = useUiStore();
  const location = useLocation();
  const qc = useQueryClient();

  const [upgradeMessage, setUpgradeMessage] = useState<string | undefined>();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Auto-close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  // Listen for limit events fired by usePlanLimits
  useEffect(() => {
    function onPlanLimit(e: Event) {
      const msg = (e as CustomEvent<{ message: string }>).detail?.message;
      setUpgradeMessage(msg);
      setShowUpgrade(true);
    }
    window.addEventListener('plan:limit', onPlanLimit);
    return () => window.removeEventListener('plan:limit', onPlanLimit);
  }, []);

  // Refresh billing usage every 5 minutes while the app is open
  useEffect(() => {
    const id = setInterval(() => {
      void qc.invalidateQueries({ queryKey: ['billing', 'usage'] });
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [qc]);

  // Exit focus mode on Escape
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') exitFocusMode();
  }, [exitFocusMode]);

  useEffect(() => {
    if (!isFocusMode) return;
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFocusMode, handleEscape]);

  // Swipe from left edge to go back on mobile
  useSwipeBack();

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <OfflineBanner />
      <SocketInit />
      <Omnibar />

      {/* ── Desktop sidebar (always in DOM, width animated) ── */}
      {!isFocusMode && (
        <div className="hidden lg:flex flex-shrink-0">
          <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
        </div>
      )}

      {/* ── Mobile/Tablet sidebar overlay ── */}
      <AnimatePresence>
        {isSidebarOpen && !isFocusMode && (
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
        {!isFocusMode && <TopBar />}
        {!isFocusMode && <TrialBanner />}
        {!isFocusMode && <PlanLimitBanner />}

        {/* Scrollable page content — extra bottom padding on mobile for bottom nav */}
        <main className={`flex-1 overflow-y-auto ${isFocusMode ? 'pb-0' : 'pb-16 lg:pb-0'}`}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom navigation ── */}
      {!isFocusMode && <BottomNav />}

      {/* ── Mobile/tablet floating Enter Focus button (above bottom nav) ── */}
      {!isFocusMode && (
        <button
          onClick={enterFocusMode}
          className="fixed bottom-20 right-4 z-40 lg:hidden flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-gray-300 transition-all duration-150 hover:text-white active:scale-[0.97]"
          style={{
            background: 'rgba(8,8,18,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
          aria-label="Enter focus mode"
        >
          <ArrowsPointingOutIcon className="h-5 w-5" />
        </button>
      )}

      {/* ── Focus mode floating exit button ── */}
      {isFocusMode && (
        <button
          onClick={exitFocusMode}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 min-h-[44px] rounded-xl text-[13px] font-semibold text-gray-300 transition-all duration-150 hover:text-white active:scale-[0.97]"
          style={{
            background: 'rgba(8,8,18,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
          aria-label="Exit focus mode"
        >
          <ArrowsPointingInIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Exit Focus</span>
        </button>
      )}

      {showUpgrade && (
        <UpgradeModal
          message={upgradeMessage}
          onClose={() => { setShowUpgrade(false); setUpgradeMessage(undefined); }}
        />
      )}

      {/* Global confirm dialog — required for useConfirm() hook to work */}
      <ConfirmDialog />
    </div>
  );
}
