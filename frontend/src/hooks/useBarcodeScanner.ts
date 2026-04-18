import { useEffect, useRef, useCallback } from 'react';

/**
 * Listens for USB barcode scanner input globally.
 * Barcode scanners act as keyboard wedges: firing chars extremely fast (< 50ms each)
 * and terminating with an Enter key. This hook distinguishes that pattern from human typing.
 */
export function useBarcodeScanner(onScan: (scannedText: string) => void) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore modified combos; handle Enter as the scanner terminator
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === 'Enter') {
        const timeSinceLast = Date.now() - lastKeyTimeRef.current;
        // Only fire if we got chars fast enough to be a scanner and the buffer has content
        if (bufferRef.current.length >= 3 && timeSinceLast < 200) {
          onScan(bufferRef.current);
          e.preventDefault();
        }
        bufferRef.current = '';
        return;
      }

      if (e.key.length > 1) return; // Ignore shift, ctrl, etc.

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;

      if (elapsed > 50) {
        // Human-speed typing: reset buffer
        bufferRef.current = '';
      }

      bufferRef.current += e.key;
      lastKeyTimeRef.current = now;

      // Auto-clear buffer after 300ms of inactivity
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, 300);
    },
    [onScan]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleKeyDown]);
}
