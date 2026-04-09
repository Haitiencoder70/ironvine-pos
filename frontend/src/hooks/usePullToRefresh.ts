import { useRef, useEffect, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // px to pull before triggering, default 80
  disabled?: boolean;
}

/**
 * Attach to a scrollable container ref.
 * Calls onRefresh when user pulls down past `threshold` from the top.
 */
export function usePullToRefresh<T extends HTMLElement>(
  options: PullToRefreshOptions,
): React.RefObject<T> {
  const { onRefresh, threshold = 80, disabled = false } = options;
  const containerRef = useRef<T>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const refreshing = useRef(false);
  const indicator = useRef<HTMLDivElement | null>(null);

  const setIndicator = useCallback((progress: number) => {
    if (!indicator.current) return;
    const clamped = Math.min(progress, 1);
    indicator.current.style.opacity = String(clamped);
    indicator.current.style.transform = `translateY(${Math.round(clamped * 48 - 48)}px)`;
  }, []);

  useEffect(() => {
    const el: T = containerRef.current!;
    if (!el || disabled) return;

    // Inject indicator element
    const ind = document.createElement('div');
    ind.style.cssText = `
      position: absolute; top: 0; left: 50%; transform: translateX(-50%) translateY(-48px);
      width: 36px; height: 36px; border-radius: 50%; background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: none; pointer-events: none; z-index: 10;
    `;
    ind.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
    const parent = el.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(ind);
      indicator.current = ind;
    }

    function onTouchStart(e: TouchEvent) {
      if (el.scrollTop > 0 || refreshing.current) return;
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPulling.current || refreshing.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { isPulling.current = false; return; }
      // Prevent default scroll only when pulling down at top
      if (el.scrollTop === 0 && dy > 5) e.preventDefault();
      setIndicator(dy / threshold);
    }

    async function onTouchEnd(e: TouchEvent) {
      if (!isPulling.current || refreshing.current) return;
      isPulling.current = false;
      const dy = e.changedTouches[0].clientY - startY.current;
      if (dy >= threshold) {
        refreshing.current = true;
        setIndicator(1);
        try {
          await onRefresh();
        } finally {
          refreshing.current = false;
          setIndicator(0);
        }
      } else {
        setIndicator(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      ind.remove();
    };
  }, [onRefresh, threshold, disabled, setIndicator]);

  return containerRef as React.RefObject<T>;
}
