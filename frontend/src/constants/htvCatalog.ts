/**
 * HTV (Heat Transfer Vinyl) Catalog
 * This catalog handles specifications for vinyl rolls and sheets
 * ordered from HTV vendors.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type VinylType =
  | 'Standard'
  | 'Glitter'
  | 'Metallic'
  | 'Holographic'
  | 'Glow-in-Dark'
  | 'Reflective'
  | 'Puff/3D'
  | 'Flock'
  | 'Printable'
  | 'Stretch'
  | 'Electric/Foil'
  | 'Stripflock'
  | 'Brick'
  | 'Chameleon'
  | 'Adhesive';

export interface HTVSize {
  id: string;
  name: string;
  avgCost: number;
}

export interface HTVProductLine {
  vinylType: VinylType;
  description: string;
  pressTemp?: string;
  pressTime?: string;
  pressure?: string;
  colors: string[];
  sizes: HTVSize[];
}

export interface HTVBrand {
  brandName: string;
  productLines: Record<string, HTVProductLine>;
}

// ─── Data ──────────────────────────────────────────────────────────────────

export const HTV_CATALOG: Record<string, HTVBrand> = {
  'Siser': {
    brandName: 'Siser',
    productLines: {
      'EasyWeed': {
        vinylType: 'Standard',
        description: 'Most popular HTV. Easy to cut, weed, and apply. Works on cotton, poly, blends.',
        pressTemp: '305°F / 150°C',
        pressTime: '10-15 seconds',
        pressure: 'Medium-firm',
        colors: [
          'Black', 'White', 'Red', 'Bright Red', 'Cardinal', 'Burgundy',
          'Royal Blue', 'Navy Blue', 'Electric Blue', 'Sky Blue', 'Pale Blue', 'Fluorescent Blue',
          'Kelly Green', 'Green Apple', 'Forest Green', 'Emerald', 'Mint',
          'Orange', 'Texas Orange', 'Fluorescent Orange',
          'Yellow', 'Sun Yellow', 'Lemon Yellow', 'Fluorescent Yellow',
          'Purple', 'Bright Purple', 'Lilac', 'Lavender',
          'Pink', 'Passion Pink', 'Fluorescent Pink', 'Bubble Gum', 'Fluorescent Coral',
          'Brown', 'Chocolate', 'Tan',
          'Grey', 'Silver', 'Dark Grey', 'Light Grey',
          'Gold', 'Cream', 'Maroon', 'Teal', 'Turquoise',
          'Neon Green', 'Neon Orange', 'Neon Pink', 'Neon Yellow',
          'Fluorescent Green'
        ],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 2.50 },
          { id: '12x3ft', name: '12" x 3ft', avgCost: 5.00 },
          { id: '12x5ft', name: '12" x 5ft', avgCost: 7.50 },
          { id: '12x1yd', name: '12" x 1yd', avgCost: 5.50 },
          { id: '12x5yd', name: '12" x 5yd Roll', avgCost: 22.00 },
          { id: '12x10yd', name: '12" x 10yd Roll', avgCost: 40.00 },
          { id: '15x1yd', name: '15" x 1yd', avgCost: 7.00 },
          { id: '15x5yd', name: '15" x 5yd Roll', avgCost: 28.00 },
          { id: '15x10yd', name: '15" x 10yd Roll', avgCost: 50.00 },
          { id: '20x1yd', name: '20" x 1yd', avgCost: 9.00 },
          { id: '20x5yd', name: '20" x 5yd Roll', avgCost: 35.00 },
        ],
      },
      'EasyWeed Stretch': {
        vinylType: 'Stretch',
        description: 'Stretches with fabric. Perfect for performance wear, leggings, spandex.',
        pressTemp: '320°F / 160°C',
        pressTime: '15 seconds',
        colors: ['Black', 'White', 'Red', 'Royal Blue', 'Navy', 'Kelly Green', 'Grey', 'Silver', 'Pink', 'Purple', 'Orange', 'Gold'],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 3.50 },
          { id: '12x3ft', name: '12" x 3ft', avgCost: 7.00 },
          { id: '15x5yd', name: '15" x 5yd Roll', avgCost: 35.00 },
          { id: '20x5yd', name: '20" x 5yd Roll', avgCost: 42.00 },
        ],
      },
      'Glitter': {
        vinylType: 'Glitter',
        description: 'Sparkling glitter finish. Adds glamour to designs.',
        pressTemp: '320°F / 160°C',
        pressTime: '15-20 seconds',
        colors: [
          'Black', 'White', 'Silver', 'Gold', 'Red', 'Royal Blue', 'Hot Pink', 'Purple',
          'Rainbow White', 'Neon Orange', 'Neon Pink', 'Neon Blue', 'Neon Green',
          'Confetti', 'Galaxy Black', 'Translucent', 'Champagne', 'Rose Gold', 'Copper',
          'Old Gold', 'Baby Pink', 'Baby Blue', 'Lavender', 'Mint', 'Lemon'
        ],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 4.00 },
          { id: '20x12-sheet', name: '20" x 12" Sheet', avgCost: 6.00 },
          { id: '12x3ft', name: '12" x 3ft', avgCost: 8.00 },
          { id: '20x5yd', name: '20" x 5yd Roll', avgCost: 55.00 },
        ],
      },
      'Holographic': {
        vinylType: 'Holographic',
        description: 'Rainbow holographic effect that changes with light angle.',
        pressTemp: '305°F / 150°C',
        pressTime: '10-15 seconds',
        colors: ['Crystal', 'Silver Rainbow', 'Gold Rainbow', 'Pink Rainbow', 'Blue Rainbow', 'Black Rainbow', 'Red Rainbow', 'Green Rainbow', 'Purple Rainbow', 'Rose Gold'],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 5.00 },
          { id: '20x12-sheet', name: '20" x 12" Sheet', avgCost: 7.50 },
          { id: '12x3ft', name: '12" x 3ft', avgCost: 10.00 },
          { id: '20x5yd', name: '20" x 5yd Roll', avgCost: 65.00 },
        ],
      },
      'Electric': {
        vinylType: 'Metallic',
        description: 'Mirror-like metallic foil finish. High-impact shine.',
        pressTemp: '305°F / 150°C',
        pressTime: '10-15 seconds',
        colors: ['Silver', 'Gold', 'Rose Gold', 'Red', 'Blue', 'Green', 'Purple', 'Copper', 'Black', 'White'],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 4.50 },
          { id: '15x12-sheet', name: '15" x 12" Sheet', avgCost: 6.00 },
          { id: '12x5ft', name: '12" x 5ft', avgCost: 15.00 },
        ],
      },
      'StripFlock': {
        vinylType: 'Flock',
        description: 'Soft, velvety raised texture. Premium look and feel.',
        pressTemp: '320°F / 160°C',
        pressTime: '15-20 seconds',
        colors: ['Black', 'White', 'Red', 'Royal Blue', 'Navy', 'Green', 'Purple', 'Pink', 'Grey', 'Brown', 'Maroon', 'Orange'],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 5.50 },
          { id: '15x12-sheet', name: '15" x 12" Sheet', avgCost: 7.50 },
          { id: '12x5ft', name: '12" x 5ft', avgCost: 18.00 },
        ],
      },
      'Brick': {
        vinylType: 'Standard',
        description: 'Slightly rough brick-like texture. Creates vintage, distressed look.',
        pressTemp: '340°F / 170°C',
        pressTime: '15-20 seconds',
        colors: ['Black', 'White', 'Silver', 'Gold', 'Red', 'Navy', 'Brown', 'Orange', 'Yellow', 'Grey', 'Pink', 'Green', 'Purple'],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 3.50 },
          { id: '20x12-sheet', name: '20" x 12" Sheet', avgCost: 5.50 },
          { id: '12x5ft', name: '12" x 5ft', avgCost: 12.00 },
        ],
      },
      'EasyWeed Glow': {
        vinylType: 'Glow-in-Dark',
        description: 'Glows green in the dark after light exposure.',
        pressTemp: '305°F / 150°C',
        pressTime: '10-15 seconds',
        colors: ['Green Glow', 'Blue Glow', 'Pink Glow'],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 6.00 },
          { id: '15x12-sheet', name: '15" x 12" Sheet', avgCost: 8.00 },
          { id: '12x3ft', name: '12" x 3ft', avgCost: 12.00 },
        ],
      },
      'EasyWeed Reflective': {
        vinylType: 'Reflective',
        description: 'Reflects light back. Safety applications and special effects.',
        pressTemp: '320°F / 160°C',
        pressTime: '15 seconds',
        colors: ['Silver', 'White'],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 7.00 },
          { id: '20x12-sheet', name: '20" x 12" Sheet', avgCost: 10.00 },
        ],
      },
      'EasyPSV': {
        vinylType: 'Adhesive',
        description: 'Permanent adhesive vinyl for hard surfaces (cups, signs, decals). NOT for garments.',
        colors: ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Pink', 'Purple', 'Gold', 'Silver', 'Grey'],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 1.75 },
          { id: '12x5ft', name: '12" x 5ft', avgCost: 5.00 },
          { id: '12x5yd', name: '12" x 5yd Roll', avgCost: 12.00 },
        ],
      },
    },
  },
  "Stahls' CAD-CUT": {
    brandName: "Stahls' CAD-CUT",
    productLines: {
      'Premium Plus': {
        vinylType: 'Standard',
        description: 'Professional grade HTV. Excellent durability and color range.',
        pressTemp: '330°F / 165°C',
        pressTime: '15 seconds',
        colors: ['Black', 'White', 'Red', 'Navy', 'Royal', 'Kelly Green', 'Grey', 'Orange', 'Maroon', 'Purple', 'Gold', 'Silver', 'Brown'],
        sizes: [
          { id: '15x5yd', name: '15" x 5yd Roll', avgCost: 30.00 },
          { id: '15x10yd', name: '15" x 10yd Roll', avgCost: 55.00 },
          { id: '20x5yd', name: '20" x 5yd Roll', avgCost: 38.00 },
        ],
      },
      'Glitter Flake': {
        vinylType: 'Glitter',
        description: 'Large glitter flake pattern. Bold sparkle effect.',
        pressTemp: '330°F / 165°C',
        pressTime: '15 seconds',
        colors: ['Silver', 'Gold', 'Black', 'Red', 'Royal Blue', 'Hot Pink', 'Rose Gold', 'Galaxy', 'Rainbow'],
        sizes: [
          { id: '20x12-sheet', name: '20" x 12" Sheet', avgCost: 7.00 },
          { id: '20x5yd', name: '20" x 5yd Roll', avgCost: 55.00 },
        ],
      },
    },
  },
  'StarCraft': {
    brandName: 'StarCraft',
    productLines: {
      'SoftFlex': {
        vinylType: 'Standard',
        description: 'Soft, thin, and flexible HTV. Very easy to cut and weed.',
        pressTemp: '305°F',
        pressTime: '10-15 seconds',
        colors: ['Black', 'White', 'Red', 'Royal', 'Navy', 'Kelly Green', 'Orange', 'Yellow', 'Purple',
                 'Pink', 'Grey', 'Silver', 'Gold', 'Brown', 'Maroon', 'Teal', 'Coral', 'Mint', 'Lavender'],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 2.00 },
          { id: '12x5ft', name: '12" x 5ft', avgCost: 6.00 },
          { id: '15x5yd', name: '15" x 5yd Roll', avgCost: 25.00 },
        ],
      },
      'Electra Foil': {
        vinylType: 'Metallic',
        description: 'Bright metallic foil finish.',
        colors: ['Silver', 'Gold', 'Rose Gold', 'Red', 'Blue', 'Green', 'Purple', 'Copper'],
        sizes: [
          { id: '12x12-sheet', name: '12" x 12" Sheet', avgCost: 4.00 },
          { id: '12x5ft', name: '12" x 5ft', avgCost: 12.00 },
        ],
      },
    },
  },
};

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Returns all available HTV brand names
 */
export function getHTVBrands(): string[] {
  return Object.keys(HTV_CATALOG);
}

/**
 * Returns product lines for a specific brand
 */
export function getProductLinesByBrand(brandId: string): string[] {
  const brand = HTV_CATALOG[brandId];
  return brand ? Object.keys(brand.productLines) : [];
}

/**
 * Returns only colors available for a specific product line
 */
export function getColorsByProductLine(brandId: string, productLineId: string): string[] {
  const brand = HTV_CATALOG[brandId];
  const line = brand?.productLines[productLineId];
  return line ? line.colors : [];
}

/**
 * Returns only sizes available for a specific product line
 */
export function getSizesByProductLine(brandId: string, productLineId: string): HTVSize[] {
  const brand = HTV_CATALOG[brandId];
  const line = brand?.productLines[productLineId];
  return line ? line.sizes : [];
}

/**
 * Returns full info including press settings and description
 */
export function getProductLineDetails(brandId: string, productLineId: string): HTVProductLine | null {
  const brand = HTV_CATALOG[brandId];
  return brand?.productLines[productLineId] || null;
}

/**
 * Returns a user-friendly label for the vinyl type
 */
export function getVinylTypeLabel(vinylType: VinylType): string {
  const labels: Record<VinylType, string> = {
    'Standard': 'Standard HTV',
    'Glitter': 'Glitter HTV',
    'Metallic': 'Metallic Foil HTV',
    'Holographic': 'Holographic HTV',
    'Glow-in-Dark': 'Glow-in-the-Dark HTV',
    'Reflective': 'Reflective HTV',
    'Puff/3D': 'Puff/3D HTV',
    'Flock': 'Flock (Velvet) HTV',
    'Printable': 'Printable HTV',
    'Stretch': 'Stretch HTV',
    'Electric/Foil': 'Electric Foil HTV',
    'Stripflock': 'Stripflock HTV',
    'Brick': 'Brick Texture HTV',
    'Chameleon': 'Chameleon HTV',
    'Adhesive': 'Adhesive Vinyl (PSV)',
  };
  return labels[vinylType] || vinylType;
}

/**
 * Returns press settings for a product line
 */
export function getPressSettings(brandId: string, productLineId: string) {
  const details = getProductLineDetails(brandId, productLineId);
  if (!details) return null;
  return {
    temp: details.pressTemp,
    time: details.pressTime,
    pressure: details.pressure,
    notes: details.description,
  };
}

/**
 * Generates a professional description for the HTV item
 */
export function generateHTVDescription(brand: string, productLine: string, color: string, size: string, quantity: number): string {
  return `${quantity}x ${brand} ${productLine} HTV - ${color} - ${size}`;
}
