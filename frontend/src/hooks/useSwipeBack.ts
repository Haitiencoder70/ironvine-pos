import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SwipeBackOptions {
  /** Horizontal distance to trigger back navigation, default 80px */
  threshold?: number;
  /** Only activate when scroll position is 0 */
  requireScrollTop?: boolean;
  /** Disable the hook */
  disabled?: boolean;
}

/**
 * Attaches a swipe-right-from-left-edge gesture to navigate back.
 * Only activates when touch starts within 20px of the left edge.
 */
export function useSwipeBack(options: SwipeBackOptions = {}): void {
  const { threshold = 80, disabled = false } = options;
  const navigate = useNavigate();

  useEffect(() => {
    if (disabled) return;

    let startX = 0;
    let startY = 0;
    let active = false;

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      // Only activate from the left edge (first 20px)
      active = startX <= 20;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!active) return;
      active = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = Math.abs(e.changedTouches[0].clientY - startY);
      // Must be more horizontal than vertical, and past threshold
      if (dx >= threshold && dy < dx * 0.5) {
        navigate(-1);
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate, threshold, disabled]);
}
