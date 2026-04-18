// Shared types for all garment SVG components

export interface GarmentSVGProps {
  /** Garment fill color as hex string, e.g. '#1a1a1a' */
  color: string;
  /** Which side to render */
  view?: 'front' | 'back';
  /** Draw dashed print-area rectangles */
  showPrintArea?: boolean;
  /** Which print locations to highlight (highlighted = filled tint, not just dashed) */
  activePrintLocations?: string[];
  /** URL of design image to overlay in the print area */
  designOverlay?: string;
  /** Which print location the overlay targets (defaults to 'Front' / 'Back') */
  designOverlayLocation?: string;
  className?: string;
}

/** A single named print region (all values 0-100, percentage of the SVG viewBox) */
export interface PrintRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
