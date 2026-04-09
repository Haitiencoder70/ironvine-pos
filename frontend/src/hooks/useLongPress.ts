import { useRef, useCallback } from 'react';

interface LongPressOptions {
  threshold?: number; // ms before long press fires, default 500
  onStart?: () => void;
  onFinish?: () => void;
  onCancel?: () => void;
}

interface LongPressResult {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function useLongPress(
  callback: (e: React.MouseEvent | React.TouchEvent) => void,
  { threshold = 500, onStart, onFinish, onCancel }: LongPressOptions = {},
): LongPressResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedEvent = useRef<React.MouseEvent | React.TouchEvent | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      savedEvent.current = e;
      isLongPress.current = false;
      onStart?.();
      timerRef.current = setTimeout(() => {
        isLongPress.current = true;
        onFinish?.();
        if (savedEvent.current) callback(savedEvent.current);
      }, threshold);
    },
    [callback, threshold, onStart, onFinish],
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isLongPress.current) onCancel?.();
  }, [onCancel]);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
  };
}
