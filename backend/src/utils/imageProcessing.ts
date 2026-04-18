import sharp from 'sharp';
import { GarmentType } from '@prisma/client';

// ─── Constants ────────────────────────────────────────────────────────────────

const THUMBNAIL_MAX_WIDTH = 400;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

// Printable area as percentage of garment dimensions [x%, y%, w%, h%]
const PRINT_AREA_BY_GARMENT: Record<string, [number, number, number, number]> = {
  TSHIRT: [25, 20, 50, 40],
  LONG_SLEEVE: [25, 20, 50, 38],
  HOODIE: [28, 25, 44, 32],
  SWEATSHIRT: [25, 22, 50, 36],
  POLO: [30, 22, 40, 28],
  TANK_TOP: [22, 18, 56, 44],
  JACKET: [28, 24, 44, 30],
  HAT: [20, 30, 60, 40],
  BAG: [20, 20, 60, 60],
  OTHER: [25, 20, 50, 40],
};

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateImageFile(mimeType: string, fileSizeBytes: number): void {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed: JPEG, PNG, WebP, SVG`);
  }
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large: ${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`);
  }
}

// ─── Image Processing ─────────────────────────────────────────────────────────

export async function resizeImage(
  buffer: Buffer,
  maxWidth: number = THUMBNAIL_MAX_WIDTH,
): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .toBuffer();
}

export async function optimizeImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ buffer: Buffer; width: number; height: number }> {
  let pipeline = sharp(buffer);

  if (mimeType === 'image/jpeg') {
    pipeline = pipeline.jpeg({ quality: 85, progressive: true });
  } else if (mimeType === 'image/png') {
    pipeline = pipeline.png({ compressionLevel: 8 });
  } else if (mimeType === 'image/webp') {
    pipeline = pipeline.webp({ quality: 85 });
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height };
}

export async function getImageDimensions(
  buffer: Buffer,
): Promise<{ width: number; height: number }> {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

// ─── SVG Placeholder Generation ───────────────────────────────────────────────

interface PlaceholderOptions {
  garmentType: GarmentType;
  hexColor: string;
  showPrintArea?: boolean;
  width?: number;
  height?: number;
}

/**
 * Generates a professional SVG silhouette placeholder for a garment.
 * The fill color matches the garment color selected by the user.
 */
export function generateColoredPlaceholder({
  garmentType,
  hexColor,
  showPrintArea = true,
  width = 400,
  height = 480,
}: PlaceholderOptions): string {
  const safeColor = sanitizeHexColor(hexColor);
  const isDark = isColorDark(safeColor);
  const strokeColor = isDark ? '#ffffff40' : '#00000025';
  const printAreaStroke = isDark ? '#ffffff80' : '#00000050';
  const labelColor = isDark ? '#ffffffaa' : '#00000066';

  const printArea = PRINT_AREA_BY_GARMENT[garmentType] ?? PRINT_AREA_BY_GARMENT['OTHER']!;
  const [pxPct, pyPct, pwPct, phPct] = printArea;
  const px = Math.round((pxPct / 100) * width);
  const py = Math.round((pyPct / 100) * height);
  const pw = Math.round((pwPct / 100) * width);
  const ph = Math.round((phPct / 100) * height);

  const silhouette = getSilhouettePath(garmentType, width, height);
  const printAreaSvg = showPrintArea
    ? `
  <!-- Print area boundary -->
  <rect
    x="${px}" y="${py}" width="${pw}" height="${ph}"
    fill="none"
    stroke="${printAreaStroke}"
    stroke-width="1.5"
    stroke-dasharray="6 3"
    rx="4"
  />
  <text x="${px + pw / 2}" y="${py - 6}" text-anchor="middle" font-family="system-ui,sans-serif"
    font-size="10" fill="${labelColor}" letter-spacing="0.5">PRINT AREA</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#00000020"/>
    </filter>
  </defs>

  <!-- Garment silhouette -->
  <g filter="url(#shadow)">
    <path
      d="${silhouette}"
      fill="${safeColor}"
      stroke="${strokeColor}"
      stroke-width="1"
    />
  </g>
  ${printAreaSvg}
</svg>`;
}

// ─── Silhouette Paths ─────────────────────────────────────────────────────────

function getSilhouettePath(garmentType: GarmentType, w: number, h: number): string {
  switch (garmentType) {
    case 'TSHIRT':
      return getTshirtPath(w, h);
    case 'LONG_SLEEVE':
      return getLongSleevePath(w, h);
    case 'HOODIE':
      return getHoodiePath(w, h);
    case 'SWEATSHIRT':
      return getSweatshirtPath(w, h);
    case 'POLO':
      return getPoloPath(w, h);
    case 'TANK_TOP':
      return getTankTopPath(w, h);
    case 'JACKET':
      return getJacketPath(w, h);
    case 'HAT':
      return getHatPath(w, h);
    case 'BAG':
      return getBagPath(w, h);
    default:
      return getTshirtPath(w, h);
  }
}

function getTshirtPath(w: number, h: number): string {
  // Proportional t-shirt silhouette
  const cx = w / 2;
  const neckW = w * 0.14;
  const neckH = h * 0.08;
  const shoulderW = w * 0.38;
  const sleeveW = w * 0.22;
  const sleeveH = h * 0.22;
  const bodyW = w * 0.38;
  const bodyH = h * 0.65;
  const top = h * 0.06;

  return [
    `M ${cx - neckW} ${top + neckH}`,
    `Q ${cx} ${top} ${cx + neckW} ${top + neckH}`,
    `L ${cx + shoulderW} ${top}`,
    `L ${cx + shoulderW + sleeveW} ${top + sleeveH * 0.4}`,
    `L ${cx + shoulderW + sleeveW * 0.7} ${top + sleeveH}`,
    `L ${cx + bodyW} ${top + sleeveH * 0.6}`,
    `L ${cx + bodyW} ${top + bodyH}`,
    `Q ${cx + bodyW} ${top + bodyH + h * 0.02} ${cx + bodyW - w * 0.02} ${top + bodyH + h * 0.02}`,
    `L ${cx - bodyW + w * 0.02} ${top + bodyH + h * 0.02}`,
    `Q ${cx - bodyW} ${top + bodyH + h * 0.02} ${cx - bodyW} ${top + bodyH}`,
    `L ${cx - bodyW} ${top + sleeveH * 0.6}`,
    `L ${cx - shoulderW - sleeveW * 0.7} ${top + sleeveH}`,
    `L ${cx - shoulderW - sleeveW} ${top + sleeveH * 0.4}`,
    `L ${cx - shoulderW} ${top}`,
    `Z`,
  ].join(' ');
}

function getLongSleevePath(w: number, h: number): string {
  const cx = w / 2;
  const neckW = w * 0.13;
  const neckH = h * 0.07;
  const shoulderW = w * 0.36;
  const sleeveW = w * 0.18;
  const sleeveH = h * 0.55;
  const bodyW = w * 0.36;
  const bodyH = h * 0.65;
  const top = h * 0.06;

  return [
    `M ${cx - neckW} ${top + neckH}`,
    `Q ${cx} ${top} ${cx + neckW} ${top + neckH}`,
    `L ${cx + shoulderW} ${top}`,
    `L ${cx + shoulderW + sleeveW} ${top + sleeveH * 0.15}`,
    `L ${cx + shoulderW + sleeveW * 0.85} ${top + sleeveH}`,
    `L ${cx + shoulderW + sleeveW * 0.55} ${top + sleeveH}`,
    `L ${cx + bodyW} ${top + sleeveH * 0.35}`,
    `L ${cx + bodyW} ${top + bodyH}`,
    `Q ${cx + bodyW} ${top + bodyH + h * 0.02} ${cx} ${top + bodyH + h * 0.02}`,
    `L ${cx - bodyW} ${top + bodyH}`,
    `L ${cx - bodyW} ${top + sleeveH * 0.35}`,
    `L ${cx - shoulderW - sleeveW * 0.55} ${top + sleeveH}`,
    `L ${cx - shoulderW - sleeveW * 0.85} ${top + sleeveH}`,
    `L ${cx - shoulderW - sleeveW} ${top + sleeveH * 0.15}`,
    `L ${cx - shoulderW} ${top}`,
    `Z`,
  ].join(' ');
}

function getHoodiePath(w: number, h: number): string {
  const cx = w / 2;
  const hoodW = w * 0.2;
  const hoodH = h * 0.18;
  const bodyW = w * 0.38;
  const bodyH = h * 0.65;
  const sleeveW = w * 0.2;
  const sleeveH = h * 0.55;
  const top = h * 0.04;

  return [
    // Hood
    `M ${cx - hoodW} ${top + hoodH}`,
    `Q ${cx - hoodW * 0.5} ${top} ${cx} ${top}`,
    `Q ${cx + hoodW * 0.5} ${top} ${cx + hoodW} ${top + hoodH}`,
    // Right shoulder and sleeve
    `L ${cx + bodyW} ${top + hoodH * 0.6}`,
    `L ${cx + bodyW + sleeveW} ${top + hoodH * 0.9}`,
    `L ${cx + bodyW + sleeveW * 0.8} ${top + sleeveH}`,
    `L ${cx + bodyW + sleeveW * 0.5} ${top + sleeveH}`,
    `L ${cx + bodyW} ${top + hoodH * 1.4}`,
    `L ${cx + bodyW} ${top + bodyH}`,
    `Q ${cx + bodyW} ${top + bodyH + h * 0.02} ${cx} ${top + bodyH + h * 0.02}`,
    `L ${cx - bodyW} ${top + bodyH}`,
    `L ${cx - bodyW} ${top + hoodH * 1.4}`,
    `L ${cx - bodyW - sleeveW * 0.5} ${top + sleeveH}`,
    `L ${cx - bodyW - sleeveW * 0.8} ${top + sleeveH}`,
    `L ${cx - bodyW - sleeveW} ${top + hoodH * 0.9}`,
    `L ${cx - bodyW} ${top + hoodH * 0.6}`,
    `Z`,
  ].join(' ');
}

function getSweatshirtPath(w: number, h: number): string {
  // Sweatshirt is similar to hoodie but with crew neck
  const cx = w / 2;
  const neckW = w * 0.16;
  const neckH = h * 0.07;
  const shoulderW = w * 0.38;
  const sleeveW = w * 0.2;
  const sleeveH = h * 0.54;
  const bodyW = w * 0.38;
  const bodyH = h * 0.65;
  const top = h * 0.06;

  return [
    `M ${cx - neckW} ${top + neckH}`,
    `Q ${cx} ${top} ${cx + neckW} ${top + neckH}`,
    `L ${cx + shoulderW} ${top + neckH * 0.3}`,
    `L ${cx + shoulderW + sleeveW} ${top + neckH * 0.8}`,
    `L ${cx + shoulderW + sleeveW * 0.8} ${top + sleeveH}`,
    `L ${cx + shoulderW + sleeveW * 0.5} ${top + sleeveH}`,
    `L ${cx + bodyW} ${top + sleeveH * 0.38}`,
    `L ${cx + bodyW} ${top + bodyH}`,
    `Q ${cx + bodyW} ${top + bodyH + h * 0.02} ${cx} ${top + bodyH + h * 0.02}`,
    `L ${cx - bodyW} ${top + bodyH}`,
    `L ${cx - bodyW} ${top + sleeveH * 0.38}`,
    `L ${cx - shoulderW - sleeveW * 0.5} ${top + sleeveH}`,
    `L ${cx - shoulderW - sleeveW * 0.8} ${top + sleeveH}`,
    `L ${cx - shoulderW - sleeveW} ${top + neckH * 0.8}`,
    `L ${cx - shoulderW} ${top + neckH * 0.3}`,
    `Z`,
  ].join(' ');
}

function getPoloPath(w: number, h: number): string {
  // Polo — similar to t-shirt with collar detail
  const base = getTshirtPath(w, h);
  return base; // Collar is decorative; same silhouette
}

function getTankTopPath(w: number, h: number): string {
  const cx = w / 2;
  const neckW = w * 0.12;
  const neckH = h * 0.07;
  const strapW = w * 0.1;
  const armholeD = w * 0.28;
  const bodyW = w * 0.38;
  const bodyH = h * 0.72;
  const top = h * 0.05;

  return [
    `M ${cx - neckW} ${top + neckH}`,
    `Q ${cx} ${top} ${cx + neckW} ${top + neckH}`,
    `L ${cx + strapW * 1.5} ${top + neckH}`,
    `Q ${cx + armholeD} ${top + h * 0.1} ${cx + armholeD} ${top + h * 0.22}`,
    `Q ${cx + armholeD} ${top + h * 0.32} ${cx + bodyW} ${top + h * 0.3}`,
    `L ${cx + bodyW} ${top + bodyH}`,
    `Q ${cx + bodyW} ${top + bodyH + h * 0.02} ${cx} ${top + bodyH + h * 0.02}`,
    `L ${cx - bodyW} ${top + bodyH}`,
    `Q ${cx - bodyW} ${top + h * 0.3} ${cx - armholeD} ${top + h * 0.22}`,
    `Q ${cx - armholeD} ${top + h * 0.1} ${cx - strapW * 1.5} ${top + neckH}`,
    `Z`,
  ].join(' ');
}

function getJacketPath(w: number, h: number): string {
  // Jacket — similar to long sleeve with collar
  return getLongSleevePath(w, h);
}

function getHatPath(w: number, h: number): string {
  const cx = w / 2;
  const brimY = h * 0.65;
  const crownTop = h * 0.1;
  const crownW = w * 0.42;

  return [
    // Crown
    `M ${cx - crownW} ${brimY}`,
    `Q ${cx - crownW} ${crownTop} ${cx} ${crownTop}`,
    `Q ${cx + crownW} ${crownTop} ${cx + crownW} ${brimY}`,
    // Brim
    `Q ${cx + w * 0.48} ${brimY + h * 0.04} ${cx + w * 0.46} ${brimY + h * 0.08}`,
    `Q ${cx + w * 0.44} ${brimY + h * 0.12} ${cx} ${brimY + h * 0.12}`,
    `Q ${cx - w * 0.44} ${brimY + h * 0.12} ${cx - w * 0.46} ${brimY + h * 0.08}`,
    `Q ${cx - w * 0.48} ${brimY + h * 0.04} ${cx - crownW} ${brimY}`,
    `Z`,
  ].join(' ');
}

function getBagPath(w: number, h: number): string {
  const pad = w * 0.08;
  const handleH = h * 0.12;
  const handleW = w * 0.16;
  const cx = w / 2;
  const bagTop = h * 0.18;

  return [
    // Left handle
    `M ${cx - handleW} ${bagTop}`,
    `Q ${cx - handleW} ${bagTop - handleH} ${cx - handleW * 0.3} ${bagTop - handleH}`,
    `Q ${cx - handleW * 0.3 + handleW * 0.05} ${bagTop - handleH} ${cx - handleW * 0.3 + handleW * 0.05} ${bagTop}`,
    // Right handle
    `M ${cx + handleW * 0.3 - handleW * 0.05} ${bagTop}`,
    `Q ${cx + handleW * 0.3 - handleW * 0.05} ${bagTop - handleH} ${cx + handleW * 0.3} ${bagTop - handleH}`,
    `Q ${cx + handleW} ${bagTop - handleH} ${cx + handleW} ${bagTop}`,
    // Body
    `M ${pad} ${bagTop}`,
    `L ${w - pad} ${bagTop}`,
    `L ${w - pad} ${h - pad}`,
    `Q ${w - pad} ${h - pad + h * 0.01} ${cx} ${h - pad + h * 0.01}`,
    `L ${pad} ${h - pad}`,
    `Q ${pad} ${h - pad + h * 0.01} ${pad} ${h - pad}`,
    `Z`,
  ].join(' ');
}

// ─── Color Helpers ────────────────────────────────────────────────────────────

function sanitizeHexColor(color: string): string {
  // Accept hex (#rgb or #rrggbb) or named CSS colors
  const hexMatch = color.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (hexMatch) {
    const hex = hexMatch[1]!;
    return `#${hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex}`;
  }
  // Fallback to a neutral gray for unknown color formats
  return '#808080';
}

function isColorDark(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Perceived brightness (ITU-R BT.709)
  const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return brightness < 128;
}
