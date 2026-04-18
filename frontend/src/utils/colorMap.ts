// ─── Garment Color Map ────────────────────────────────────────────────────────
// Maps garment color names (as printed on product sheets) to hex values for
// SVG placeholder rendering. Covers all major blank apparel brands.

export const GARMENT_COLOR_MAP: Record<string, string> = {
  // ── Basics ──────────────────────────────────────────────────────────────────
  Black: '#1a1a1a',
  White: '#f5f5f5',
  'Off White': '#f0ede4',
  Natural: '#f5e6cc',
  Cream: '#fffdd0',
  Ivory: '#fffff0',
  'Vintage White': '#f3ead3',

  // ── Navy / Blue family ───────────────────────────────────────────────────────
  Navy: '#1b2a4a',
  'Navy Blue': '#1b2a4a',
  'Midnight Navy': '#191970',
  Royal: '#2851a3',
  'Royal Blue': '#2851a3',
  'True Royal': '#2851a3',
  'Carolina Blue': '#7bafd4',
  'Light Blue': '#a4c8e1',
  'Sky Blue': '#87ceeb',
  Sapphire: '#0f52ba',
  'Indigo Blue': '#3f51b5',
  'Ocean Blue': '#4f84c4',
  'Electric Blue': '#0066ff',
  'Steel Blue': '#4682b4',
  'Dusty Blue': '#6699cc',
  'Cool Blue': '#4a90d9',
  'Stonewash Denim': '#6c7b8a',
  'Ice Blue': '#c5dde8',
  'Lagoon Blue': '#1d8a99',
  'Flo Blue': '#449dd1',
  'Blue Jean': '#5c7fa3',
  'Blue Spruce': '#4c787e',
  Chambray: '#6e8aa5',
  'Washed Denim': '#7b9bb3',

  // ── Red family ───────────────────────────────────────────────────────────────
  Red: '#cc0000',
  'Bright Red': '#ff0000',
  Cardinal: '#8c1515',
  Burgundy: '#6b1c23',
  Maroon: '#5c1a1b',
  Wine: '#722f37',
  Crimson: '#b80f0a',
  Oxblood: '#4a0000',
  Watermelon: '#e05f71',
  Crunchberry: '#de4f6a',

  // ── Green family ─────────────────────────────────────────────────────────────
  'Kelly Green': '#4cbb17',
  Kelly: '#4cbb17',
  'Forest Green': '#224b22',
  'Irish Green': '#009a44',
  'Military Green': '#4b5320',
  Olive: '#556b2f',
  Sage: '#87ae73',
  Mint: '#98ff98',
  'Heather Mint': '#b3e0c2',
  'Green Apple': '#8db600',
  Emerald: '#046307',
  'Safety Green': '#30b21a',
  'Neon Green': '#39ff14',
  Teal: '#008080',
  Turquoise: '#30d5c8',
  Cancun: '#40bfa2',
  Seafoam: '#93e9be',
  'Chalky Mint': '#c5e8c1',
  'Heather Olive': '#6b7f4e',
  'Island Reef': '#41c0a2',
  Bay: '#5d8a68',

  // ── Orange family ─────────────────────────────────────────────────────────────
  Orange: '#ff6600',
  'Safety Orange': '#ff6700',
  'Texas Orange': '#cc5500',
  'Burnt Orange': '#cc5500',
  'Classic Orange': '#ff6600',
  'Neon Orange': '#ff5f1f',
  Sunset: '#f76f5c',
  Yam: '#cc6633',
  Brick: '#9e4a2f',

  // ── Yellow / Gold family ──────────────────────────────────────────────────────
  Yellow: '#ffd700',
  Gold: '#cfaa1e',
  'Old Gold': '#cfb53b',
  'Sun Yellow': '#ffd300',
  'Lemon Yellow': '#fff44f',
  Lemon: '#fff44f',
  Daisy: '#fff700',
  Mustard: '#c4a035',
  'Banana Cream': '#ffe9a1',
  Butter: '#ffeaa7',
  'Neon Yellow': '#cfff04',

  // ── Purple family ─────────────────────────────────────────────────────────────
  Purple: '#663399',
  'Team Purple': '#663399',
  'Bright Purple': '#7b2d8b',
  Lilac: '#c8a2c8',
  Lavender: '#b57edc',
  Orchid: '#da70d6',
  Violet: '#7f00ff',
  Periwinkle: '#8e82fe',

  // ── Pink family ───────────────────────────────────────────────────────────────
  Pink: '#ff69b4',
  'Hot Pink': '#ff1493',
  'Soft Pink': '#f4c2c2',
  'Light Pink': '#ffb6c1',
  Heliconia: '#d6336c',
  'Charity Pink': '#e57eb2',
  'Passion Pink': '#e55b8d',
  'Neon Pink': '#ff6ec7',
  Coral: '#ff6f61',
  'Coral Silk': '#f88379',
  Mauve: '#c08497',
  Berry: '#8e4585',
  'Bright Salmon': '#fa8072',
  'Fluorescent Coral': '#ff6f61',
  'Bubble Gum': '#ffc1cc',
  'Desert Pink': '#d4a5a5',
  Blossom: '#f7c8da',
  'Heather Mauve': '#c4a1b0',

  // ── Brown / Tan family ────────────────────────────────────────────────────────
  Brown: '#5c3317',
  Chocolate: '#3c1414',
  Tan: '#d2b48c',
  Sand: '#c2b280',
  Sandstone: '#786d5f',
  Hemp: '#a59272',
  'Prairie Dust': '#a08060',
  Russet: '#80461b',

  // ── Grey family ───────────────────────────────────────────────────────────────
  Grey: '#808080',
  Gray: '#808080',
  'Sport Grey': '#939598',
  'Sport Gray': '#939598',
  'Light Grey': '#c0c0c0',
  'Light Gray': '#c0c0c0',
  'Light Steel': '#b0b7c0',
  'Dark Heather': '#414a4c',
  'Dark Grey Heather': '#4a4e54',
  'Dark Grey': '#4a4e54',
  'Dark Gray': '#4a4e54',
  Charcoal: '#36454f',
  Graphite: '#383838',
  'Graphite Heather': '#5a5a5a',
  Ash: '#b0b0b0',
  'Ash Grey': '#b0b0b0',
  'Ash Gray': '#b0b0b0',
  'Smoke Grey': '#808588',
  'Heavy Metal': '#4a4e54',
  Silver: '#c0c0c0',
  'Athletic Heather': '#b8b8b8',
  'Heather Grey': '#b8b8b8',
  'Heather Gray': '#b8b8b8',
  Pepper: '#5b5b5b',
  Granite: '#676767',
  Asphalt: '#555555',
  Storm: '#5a5e63',

  // ── Triblend (heathered) ──────────────────────────────────────────────────────
  'Solid Black Triblend': '#2a2a2a',
  'White Fleck Triblend': '#e8e8e8',
  'Grey Triblend': '#a0a0a0',
  'Navy Triblend': '#3d5075',
  'Charcoal-Black Triblend': '#3d3d3d',
  'True Royal Triblend': '#4d72b8',
  'Red Triblend': '#d44d4d',
  'Athletic Grey Triblend': '#bcbcbc',
  'Emerald Triblend': '#3d8c57',
  'Mauve Triblend': '#c99aaa',
  'Mustard Triblend': '#d4b14f',
  'Rust Triblend': '#a45a3c',
  'Teal Triblend': '#4d9999',
  'Peach Triblend': '#f4b8a0',
};

// ─── Lookup Functions ─────────────────────────────────────────────────────────

export function getGarmentColorHex(colorName: string): string {
  if (!colorName) return '#cccccc';

  // Direct match
  const direct = GARMENT_COLOR_MAP[colorName];
  if (direct) return direct;

  // Case-insensitive exact match
  const lower = colorName.toLowerCase();
  for (const [key, value] of Object.entries(GARMENT_COLOR_MAP)) {
    if (key.toLowerCase() === lower) return value;
  }

  // Partial match — prefer the longer key to avoid "Blue" matching "Royal Blue" poorly
  let bestMatch = '';
  let bestValue = '#cccccc';
  for (const [key, value] of Object.entries(GARMENT_COLOR_MAP)) {
    const kl = key.toLowerCase();
    if (
      (kl.includes(lower) || lower.includes(kl)) &&
      key.length > bestMatch.length
    ) {
      bestMatch = key;
      bestValue = value;
    }
  }

  return bestValue;
}

/**
 * Returns '#ffffff' or '#333333' for readable text/icons on top of a garment.
 */
export function getContrastColor(hexColor: string): '#ffffff' | '#333333' {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#333333' : '#ffffff';
}

/**
 * Returns true if the garment is dark enough to require a white ink base
 * (relevant for DTF/Screen Print on dark shirts).
 */
export function isDarkGarment(colorName: string): boolean {
  const hex = getGarmentColorHex(colorName);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45;
}
