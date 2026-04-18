import {
  useState,
  useRef,
  useCallback,
} from 'react';
import type { MockupPosition } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DesignMockupProps {
  designImageUrl?: string;
  initialPosition?: MockupPosition;
  onSaveMockup?: (dataUrl: string, position: MockupPosition, side: 'FRONT' | 'BACK') => void;
  onSendToCustomer?: (dataUrl: string) => void;
  onUploadDesign?: () => void;
}

// ─── Garment SVGs ─────────────────────────────────────────────────────────────

// Simple t-shirt silhouettes as inline SVG paths (front / back)
const TSHIRT_FRONT = `
<svg viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
  <path d="M110 20 Q150 5 190 20 L240 55 L210 75 L210 320 L90 320 L90 75 L60 55 Z"
        fill="#e5e7eb" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round"/>
  <!-- collar -->
  <path d="M110 20 Q150 45 190 20" fill="none" stroke="#9ca3af" stroke-width="2"/>
  <!-- left sleeve -->
  <path d="M110 20 L60 55 L90 75 L110 55 Z"
        fill="#d1d5db" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round"/>
  <!-- right sleeve -->
  <path d="M190 20 L240 55 L210 75 L190 55 Z"
        fill="#d1d5db" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round"/>
</svg>`;

const TSHIRT_BACK = `
<svg viewBox="0 0 300 340" xmlns="http://www.w3.org/2000/svg">
  <path d="M110 20 Q150 5 190 20 L240 55 L210 75 L210 320 L90 320 L90 75 L60 55 Z"
        fill="#e5e7eb" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round"/>
  <!-- back collar -->
  <path d="M110 20 Q150 15 190 20" fill="none" stroke="#9ca3af" stroke-width="2"/>
  <!-- left sleeve -->
  <path d="M110 20 L60 55 L90 75 L110 55 Z"
        fill="#d1d5db" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round"/>
  <!-- right sleeve -->
  <path d="M190 20 L240 55 L210 75 L190 55 Z"
        fill="#d1d5db" stroke="#9ca3af" stroke-width="2" stroke-linejoin="round"/>
</svg>`;

// Print area bounds (as % of SVG viewport 300x340)
const PRINT_AREA = { x: 30, y: 22, width: 40, height: 55 }; // percentages of garment area

// ─── Default position ─────────────────────────────────────────────────────────

const DEFAULT_POSITION: MockupPosition = {
  x: 50,
  y: 45,
  width: 28,
  rotation: 0,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DesignMockup({
  designImageUrl,
  initialPosition = DEFAULT_POSITION,
  onSaveMockup,
  onSendToCustomer,
  onUploadDesign,
}: DesignMockupProps) {
  const [side, setSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [position, setPosition] = useState<MockupPosition>(initialPosition);
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // ── Drag to reposition ────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!designImageUrl) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: position.x,
        origY: position.y,
      };
    },
    [position.x, position.y, designImageUrl],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
      setPosition((p) => ({
        ...p,
        x: Math.min(Math.max(dragRef.current!.origX + dx, 10), 90),
        y: Math.min(Math.max(dragRef.current!.origY + dy, 10), 90),
      }));
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── Size controls ─────────────────────────────────────────────────────────

  const grow = () => setPosition((p) => ({ ...p, width: Math.min(p.width + 3, 60) }));
  const shrink = () => setPosition((p) => ({ ...p, width: Math.max(p.width - 3, 8) }));

  // ── Arrow nudge ───────────────────────────────────────────────────────────

  const nudge = (dx: number, dy: number) =>
    setPosition((p) => ({
      ...p,
      x: Math.min(Math.max(p.x + dx, 10), 90),
      y: Math.min(Math.max(p.y + dy, 10), 90),
    }));

  // ── Export mockup as PNG ──────────────────────────────────────────────────

  const exportMockup = useCallback(async (): Promise<string | null> => {
    if (!containerRef.current || !designImageUrl) return null;
    try {
      // Dynamic import — html2canvas is optional; graceful fallback if absent
      const mod = await import(/* @vite-ignore */ 'html2canvas' as string) as { default: (el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement> };
      const canvas = await mod.default(containerRef.current, { useCORS: true, scale: 2 });
      return canvas.toDataURL('image/png');
    } catch {
      // html2canvas not installed — return design URL as fallback
      return designImageUrl;
    }
  }, [designImageUrl]);

  const handleSave = async () => {
    if (!onSaveMockup) return;
    setIsSaving(true);
    const dataUrl = await exportMockup();
    setIsSaving(false);
    if (dataUrl) onSaveMockup(dataUrl, position, side);
  };

  const handleSend = async () => {
    if (!onSendToCustomer) return;
    setIsSaving(true);
    const dataUrl = await exportMockup();
    setIsSaving(false);
    if (dataUrl) onSendToCustomer(dataUrl);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const garmentSvg = side === 'FRONT' ? TSHIRT_FRONT : TSHIRT_BACK;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-gray-800 text-base">Design Mockup Preview</h3>

      {/* Garment canvas */}
      <div
        ref={containerRef}
        className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden select-none"
        style={{ aspectRatio: '300 / 340' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Garment SVG */}
        <div
          className="absolute inset-0 flex items-center justify-center p-4"
          dangerouslySetInnerHTML={{ __html: garmentSvg }}
        />

        {/* Print area guide */}
        <div
          className="absolute border border-dashed border-blue-300/60 rounded pointer-events-none"
          style={{
            left: `${PRINT_AREA.x}%`,
            top: `${PRINT_AREA.y}%`,
            width: `${PRINT_AREA.width}%`,
            height: `${PRINT_AREA.height}%`,
          }}
        />

        {/* Design image (draggable) */}
        {designImageUrl ? (
          <img
            src={designImageUrl}
            alt="Customer design"
            draggable={false}
            onPointerDown={handlePointerDown}
            className="absolute cursor-move touch-none"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: `${position.width}%`,
              transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
            }}
          />
        ) : (
          <div
            className="absolute flex flex-col items-center justify-center text-gray-300 text-xs gap-1 pointer-events-none"
            style={{
              left: `${PRINT_AREA.x}%`,
              top: `${PRINT_AREA.y}%`,
              width: `${PRINT_AREA.width}%`,
              height: `${PRINT_AREA.height}%`,
            }}
          >
            <span className="text-2xl">🖼</span>
            <span>Design here</span>
          </div>
        )}
      </div>

      {/* Side toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        {(['FRONT', 'BACK'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={[
              'flex-1 min-h-[44px] text-sm font-medium transition-colors',
              side === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {s === 'FRONT' ? 'Front' : 'Back'}
          </button>
        ))}
      </div>

      {/* Position & size controls */}
      {designImageUrl && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">Position:</span>
            {[
              { label: '↑', dx: 0, dy: -2 },
              { label: '↓', dx: 0, dy: 2 },
              { label: '←', dx: -2, dy: 0 },
              { label: '→', dx: 2, dy: 0 },
            ].map(({ label, dx, dy }) => (
              <button
                key={label}
                type="button"
                onClick={() => nudge(dx, dy)}
                aria-label={`Move design ${label}`}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-700 font-medium text-sm active:bg-gray-100"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 mr-1">Size:</span>
            <button
              type="button"
              onClick={grow}
              aria-label="Increase design size"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-700 font-bold active:bg-gray-100"
            >
              +
            </button>
            <button
              type="button"
              onClick={shrink}
              aria-label="Decrease design size"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-700 font-bold active:bg-gray-100"
            >
              −
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 sm:flex-row">
        {onUploadDesign && (
          <button
            type="button"
            onClick={onUploadDesign}
            className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm active:bg-gray-100"
          >
            <span aria-hidden>⬆</span> Upload Design
          </button>
        )}
        {onSaveMockup && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!designImageUrl || isSaving}
            className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-blue-600 text-white font-medium text-sm active:bg-blue-700 disabled:opacity-40"
          >
            <span aria-hidden>💾</span> {isSaving ? 'Saving…' : 'Save Mockup'}
          </button>
        )}
        {onSendToCustomer && (
          <button
            type="button"
            onClick={handleSend}
            disabled={!designImageUrl || isSaving}
            className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-green-600 text-white font-medium text-sm active:bg-green-700 disabled:opacity-40"
          >
            <span aria-hidden>✉</span> {isSaving ? 'Preparing…' : 'Send to Customer'}
          </button>
        )}
      </div>
    </div>
  );
}
