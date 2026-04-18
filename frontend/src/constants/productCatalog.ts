import { clsx } from 'clsx';

/**
 * PRODUCT CATALOG SYSTEM
 *
 * This file serves as the single source of truth for all products, materials, and
 * their relevant variables. The system is designed to cascade:
 * Category -> Brand -> Style -> (Color, Size)
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ProductCatalogCategory = 'BLANK_GARMENTS' | 'DTF_TRANSFERS' | 'HTV_VINYL' | 'OTHER_MATERIALS';

export type GarmentProductType =
  | 'T-Shirt'
  | 'Hoodie'
  | 'Polo'
  | 'Tank Top'
  | 'Long Sleeve'
  | 'Sweatshirt'
  | 'Hat'
  | 'Bag';

export type SleeveType = 'Short Sleeve' | 'Long Sleeve' | 'Sleeveless' | '3/4 Sleeve';

export type FabricType =
  | '100% Cotton'
  | '50/50 Blend'
  | 'Tri-Blend'
  | '100% Polyester'
  | 'Ring-Spun Cotton'
  | '100% Airlume Combed Ring-Spun Cotton'
  | '100% Combed Ring-Spun Cotton'
  | '65% Poly / 35% Cotton'
  | '50% Poly / 25% Cotton / 25% Rayon'
  | '52% Cotton / 48% Poly'
  | '100% Ring-Spun Cotton'
  | '50/50 Cotton/Poly'
  | '100% Cotton Pique';

export type FitType = 'Classic' | 'Retail' | 'Modern' | 'Relaxed' | 'Slim' | 'Semi-Fitted' | 'Athletic';

export interface GarmentStyle {
  styleNumber: string;
  styleName: string;
  productType: GarmentProductType;
  sleeveType: SleeveType;
  fabric: FabricType;
  weight: string;
  fit: FitType;
  sizes: string[];
  colors: string[];
  avgCost: number;
}

export interface BrandCatalog {
  brandName: string;
  styles: Record<string, GarmentStyle>; // Keyed by styleNumber
}

// ─── Catalog Data ───────────────────────────────────────────────────────────────

export const GARMENT_CATALOG: Record<string, BrandCatalog> = {
  'GILDAN': {
    brandName: 'Gildan',
    styles: {
      '5000': {
        styleNumber: '5000',
        styleName: 'Heavy Cotton Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Cotton',
        weight: '5.3oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
        colors: [
          'Black', 'White', 'Navy', 'Red', 'Royal', 'Sport Grey', 'Dark Heather', 'Charcoal',
          'Forest Green', 'Maroon', 'Orange', 'Gold', 'Carolina Blue', 'Irish Green', 'Purple',
          'Safety Green', 'Safety Orange', 'Sapphire', 'Sand', 'Light Blue', 'Light Pink',
          'Heliconia', 'Indigo Blue', 'Military Green', 'Antique Cherry Red', 'Ash Grey',
          'Garnet', 'Sunset', 'Tropical Blue', 'Daisy', 'Midnight', 'Coral Silk', 'Ice Blue',
          'Prairie Dust', 'Russet', 'Graphite Heather'
        ],
        avgCost: 3.50,
      },
      '5000L': {
        styleNumber: '5000L',
        styleName: 'Heavy Cotton Ladies Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Cotton',
        weight: '5.3oz',
        fit: 'Semi-Fitted',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: [
          'Black', 'White', 'Navy', 'Red', 'Royal', 'Sport Grey', 'Light Blue', 'Light Pink',
          'Heliconia', 'Sapphire', 'Carolina Blue', 'Azalea', 'Coral Silk', 'Graphite Heather'
        ],
        avgCost: 3.75,
      },
      '5000B': {
        styleNumber: '5000B',
        styleName: 'Heavy Cotton Youth Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Cotton',
        weight: '5.3oz',
        fit: 'Classic',
        sizes: ['YXS', 'YS', 'YM', 'YL', 'YXL'],
        colors: [
          'Black', 'White', 'Navy', 'Red', 'Royal', 'Sport Grey', 'Safety Green', 'Safety Orange',
          'Light Blue', 'Light Pink', 'Heliconia', 'Purple', 'Carolina Blue', 'Irish Green'
        ],
        avgCost: 3.25,
      },
      '2000': {
        styleNumber: '2000',
        styleName: 'Ultra Cotton Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Cotton',
        weight: '6.0oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
        colors: ['Black', 'White', 'Navy', 'Red', 'Safety Orange', 'Safety Green', 'Royal', 'Charcoal', 'Sport Grey', 'Forest Green', 'Maroon'],
        avgCost: 3.75,
      },
      '64000': {
        styleNumber: '64000',
        styleName: 'Softstyle Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '65% Poly / 35% Cotton',
        weight: '4.5oz',
        fit: 'Semi-Fitted',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: [
          'Black', 'White', 'Navy', 'Red', 'Royal', 'Dark Heather', 'Charcoal', 'Sport Grey',
          'Heather Cardinal', 'Heather Navy', 'Heather Sapphire', 'Heather Military Green'
        ],
        avgCost: 3.25,
      },
      '2400': {
        styleNumber: '2400',
        styleName: 'Ultra Cotton Long Sleeve Tee',
        productType: 'T-Shirt',
        sleeveType: 'Long Sleeve',
        fabric: '100% Cotton',
        weight: '6.0oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: ['Black', 'White', 'Navy', 'Red', 'Royal', 'Sport Grey', 'Charcoal', 'Forest Green'],
        avgCost: 6.50,
      },
      '18000': {
        styleNumber: '18000',
        styleName: 'Heavy Blend Crewneck Sweatshirt',
        productType: 'Sweatshirt',
        sleeveType: 'Long Sleeve',
        fabric: '50/50 Cotton/Poly',
        weight: '8.0oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: ['Black', 'White', 'Navy', 'Red', 'Royal', 'Sport Grey', 'Dark Heather', 'Forest Green', 'Maroon', 'Safety Green', 'Ash'],
        avgCost: 8.50,
      },
      '18500': {
        styleNumber: '18500',
        styleName: 'Heavy Blend Hooded Sweatshirt',
        productType: 'Hoodie',
        sleeveType: 'Long Sleeve',
        fabric: '50/50 Cotton/Poly',
        weight: '8.0oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
        colors: [
          'Black', 'White', 'Navy', 'Red', 'Royal', 'Sport Grey', 'Dark Heather', 'Forest Green',
          'Maroon', 'Safety Green', 'Safety Orange', 'Ash', 'Sand', 'Graphite Heather',
          'Military Green', 'Carolina Blue', 'Indigo Blue', 'Old Gold'
        ],
        avgCost: 12.00,
      },
      '8000': {
        styleNumber: '8000',
        styleName: 'DryBlend Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '50/50 Cotton/Poly',
        weight: '5.5oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: ['Black', 'White', 'Navy', 'Red', 'Sport Grey', 'Royal', 'Forest Green'],
        avgCost: 3.00,
      },
      '3800': {
        styleNumber: '3800',
        styleName: 'Ultra Cotton Pique Polo',
        productType: 'Polo',
        sleeveType: 'Short Sleeve',
        fabric: '100% Cotton Pique',
        weight: '6.3oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: ['Black', 'White', 'Navy', 'Red', 'Royal', 'Sport Grey', 'Forest Green', 'Maroon'],
        avgCost: 9.00,
      },
      '2200': {
        styleNumber: '2200',
        styleName: 'Ultra Cotton Tank Top',
        productType: 'Tank Top',
        sleeveType: 'Sleeveless',
        fabric: '100% Cotton',
        weight: '6.0oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: ['Black', 'White', 'Navy', 'Red', 'Royal', 'Sport Grey'],
        avgCost: 4.50,
      },
    },
  },
  'BELLA+CANVAS': {
    brandName: 'Bella+Canvas',
    styles: {
      '3001': {
        styleNumber: '3001',
        styleName: 'Unisex Jersey Short Sleeve',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Airlume Combed Ring-Spun Cotton',
        weight: '4.2oz',
        fit: 'Retail',
        sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
        colors: [
          'Black', 'White', 'Navy', 'Red', 'True Royal', 'Athletic Heather', 'Dark Grey Heather',
          'Army', 'Asphalt', 'Berry', 'Burnt Orange', 'Dusty Blue', 'Forest', 'Gold',
          'Heather Autumn', 'Heather Clay', 'Heather Dusty Blue', 'Heather Mauve',
          'Heather Mint', 'Heather Olive', 'Heather Peach', 'Heather Prism Mint',
          'Kelly', 'Lavender', 'Lilac', 'Maroon', 'Mauve', 'Ocean Blue', 'Olive', 'Orange',
          'Orchid', 'Oxblood', 'Silver', 'Soft Pink', 'Steel Blue', 'Tan', 'Team Purple',
          'Turquoise', 'Vintage White', 'Yellow', 'Aqua', 'Charity Pink', 'Coral', 'Sage',
          'Storm', 'Sunset', 'Teal', 'True Royal'
        ],
        avgCost: 4.25,
      },
      '3001Y': {
        styleNumber: '3001Y',
        styleName: 'Youth Jersey Short Sleeve',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Airlume Combed Ring-Spun Cotton',
        weight: '4.2oz',
        fit: 'Retail',
        sizes: ['YXS', 'YS', 'YM', 'YL', 'YXL'],
        colors: ['Black', 'White', 'Navy', 'Red', 'True Royal', 'Athletic Heather', 'Heather Columbia Blue', 'Heather Peach', 'Kelly', 'Pink', 'Yellow', 'Aqua'],
        avgCost: 4.00,
      },
      '3413': {
        styleNumber: '3413',
        styleName: 'Unisex Triblend Short Sleeve',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '50% Poly / 25% Cotton / 25% Rayon',
        weight: '3.8oz',
        fit: 'Retail',
        sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: [
          'Solid Black Triblend', 'White Fleck Triblend', 'Grey Triblend', 'Navy Triblend',
          'Charcoal-Black Triblend', 'True Royal Triblend', 'Red Triblend',
          'Athletic Grey Triblend', 'Emerald Triblend', 'Mauve Triblend',
          'Mustard Triblend', 'Rust Triblend', 'Teal Triblend', 'Peach Triblend'
        ],
        avgCost: 5.50,
      },
      '3501': {
        styleNumber: '3501',
        styleName: 'Unisex Jersey Long Sleeve',
        productType: 'T-Shirt',
        sleeveType: 'Long Sleeve',
        fabric: '100% Airlume Combed Ring-Spun Cotton',
        weight: '4.2oz',
        fit: 'Retail',
        sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
        colors: ['Black', 'White', 'Navy', 'Red', 'True Royal', 'Athletic Heather', 'Dark Grey Heather', 'Army', 'Asphalt', 'Heather Mauve', 'Kelly', 'Maroon', 'Silver', 'Steel Blue', 'Team Purple'],
        avgCost: 7.50,
      },
      '3719': {
        styleNumber: '3719',
        styleName: 'Unisex Sponge Fleece Hoodie',
        productType: 'Hoodie',
        sleeveType: 'Long Sleeve',
        fabric: '52% Cotton / 48% Poly',
        weight: '7.0oz',
        fit: 'Retail',
        sizes: ['S', 'M', 'L', 'XL', '2XL'],
        colors: ['Black', 'White', 'Navy', 'Dark Grey Heather', 'True Royal', 'Athletic Heather', 'Maroon', 'Military Green', 'Storm', 'Mauve', 'Heather Dusty Blue'],
        avgCost: 16.00,
      },
      '3901': {
        styleNumber: '3901',
        styleName: 'Unisex Sponge Fleece Sweatshirt',
        productType: 'Sweatshirt',
        sleeveType: 'Long Sleeve',
        fabric: '52% Cotton / 48% Poly',
        weight: '7.0oz',
        fit: 'Retail',
        sizes: ['S', 'M', 'L', 'XL', '2XL'],
        colors: ['Black', 'White', 'Navy', 'Dark Grey Heather', 'True Royal', 'Athletic Heather', 'Maroon', 'Military Green'],
        avgCost: 14.50,
      },
    },
  },
  'NEXT LEVEL APPAREL': {
    brandName: 'Next Level Apparel',
    styles: {
      '3600': {
        styleNumber: '3600',
        styleName: 'Unisex Cotton Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Combed Ring-Spun Cotton',
        weight: '4.3oz',
        fit: 'Modern',
        sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: [
          'Black', 'White', 'Midnight Navy', 'Red', 'Royal', 'Heavy Metal', 'Dark Heather Gray',
          'Heather Gray', 'Forest Green', 'Maroon', 'Military Green', 'Natural', 'Light Blue',
          'Purple Rush', 'Kelly Green', 'Banana Cream', 'Cancun', 'Charity Pink',
          'Classic Orange', 'Cool Blue', 'Desert Pink', 'Lavender', 'Sage', 'Stonewash Denim'
        ],
        avgCost: 3.75,
      },
      '3600A': {
        styleNumber: '3600A',
        styleName: 'Unisex Cotton Athletic Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Combed Ring-Spun Cotton',
        weight: '4.3oz',
        fit: 'Athletic',
        sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: ['Black', 'White', 'Red', 'Royal', 'Heather Gray', 'Dark Heather Gray'],
        avgCost: 4.00,
      },
      '6210': {
        styleNumber: '6210',
        styleName: 'Unisex CVC Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '60% Cotton / 40% Poly',
        weight: '4.3oz',
        fit: 'Modern',
        sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: ['Black', 'White', 'Midnight Navy', 'Charcoal', 'Dark Heather Gray', 'Red', 'Royal', 'Cool Blue', 'Desert Pink', 'Heather Gray', 'Light Olive', 'Lilac', 'Sage'],
        avgCost: 4.00,
      },
      '3633': {
        styleNumber: '3633',
        styleName: 'Youth Cotton Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Combed Ring-Spun Cotton',
        weight: '4.3oz',
        fit: 'Modern',
        sizes: ['YXS', 'YS', 'YM', 'YL', 'YXL'],
        colors: ['Black', 'White', 'Midnight Navy', 'Red', 'Royal', 'Heather Gray', 'Kelly Green', 'Light Blue', 'Light Pink', 'Purple Rush'],
        avgCost: 3.50,
      },
    },
  },
  'COMFORT COLORS': {
    brandName: 'Comfort Colors',
    styles: {
      '1717': {
        styleNumber: '1717',
        styleName: 'Garment-Dyed Heavyweight Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Ring-Spun Cotton',
        weight: '6.1oz',
        fit: 'Relaxed',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'],
        colors: [
          'Black', 'White', 'Butter', 'Blue Jean', 'Blue Spruce', 'Brick', 'Bright Salmon',
          'Chambray', 'Chalky Mint', 'Crimson', 'Flo Blue', 'Granite', 'Graphite', 'Hemp',
          'Ice Blue', 'Ivory', 'Lagoon Blue', 'Light Green', 'Moss', 'Mustard', 'Neon Pink',
          'Orchid', 'Pepper', 'Seafoam', 'True Navy', 'Violet', 'Watermelon', 'Wine', 'Yam',
          'Bay', 'Berry', 'Blossom', 'Burnt Orange', 'Crunchberry', 'Island Reef', 'Lemon',
          'Neon Orange', 'Periwinkle', 'Sandstone', 'Washed Denim'
        ],
        avgCost: 5.75,
      },
      '1566': {
        styleNumber: '1566',
        styleName: 'Garment-Dyed Crewneck Sweatshirt',
        productType: 'Sweatshirt',
        sleeveType: 'Long Sleeve',
        fabric: '100% Ring-Spun Cotton',
        weight: '9.5oz',
        fit: 'Relaxed',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: [
          'Black', 'White', 'Butter', 'Blue Jean', 'Chalky Mint', 'Crimson', 'Granite',
          'Ivory', 'Moss', 'Pepper', 'Seafoam', 'True Navy', 'Violet', 'Wine', 'Yam',
          'Flo Blue', 'Light Green', 'Orchid', 'Berry'
        ],
        avgCost: 18.00,
      },
      '1567': {
        styleNumber: '1567',
        styleName: 'Garment-Dyed Hooded Sweatshirt',
        productType: 'Hoodie',
        sleeveType: 'Long Sleeve',
        fabric: '100% Ring-Spun Cotton',
        weight: '9.5oz',
        fit: 'Relaxed',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: [
          'Black', 'White', 'Butter', 'Blue Jean', 'Chalky Mint', 'Crimson', 'Granite',
          'Ivory', 'Pepper', 'Seafoam', 'True Navy', 'Wine', 'Yam', 'Berry', 'Flo Blue',
          'Moss', 'Light Green'
        ],
        avgCost: 26.00,
      },
    },
  },
  'HANES': {
    brandName: 'Hanes',
    styles: {
      '5250': {
        styleNumber: '5250',
        styleName: 'Tagless Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Cotton',
        weight: '6.0oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: ['Black', 'White', 'Navy', 'Red', 'Deep Royal', 'Light Steel', 'Smoke Grey', 'Safety Green', 'Safety Orange', 'Ash', 'Deep Forest', 'Maroon'],
        avgCost: 3.00,
      },
      'W110': {
        styleNumber: 'W110',
        styleName: 'Workwear Short Sleeve Pocket Tee',
        productType: 'T-Shirt',
        sleeveType: 'Short Sleeve',
        fabric: '100% Cotton',
        weight: '6.0oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: ['Black', 'White', 'Navy', 'Safety Green', 'Safety Orange', 'Charcoal Heather'],
        avgCost: 5.00,
      },
      'P170': {
        styleNumber: 'P170',
        styleName: 'EcoSmart Pullover Hoodie',
        productType: 'Hoodie',
        sleeveType: 'Long Sleeve',
        fabric: '50/50 Cotton/Poly',
        weight: '7.8oz',
        fit: 'Classic',
        sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
        colors: ['Black', 'White', 'Navy', 'Red', 'Deep Royal', 'Light Steel', 'Smoke Grey', 'Safety Green', 'Maroon', 'Ash', 'Deep Forest'],
        avgCost: 10.50,
      },
    },
  },
};

// ─── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Returns a list of all available brand names in the garment catalog.
 */
export function getBrands(): string[] {
  return Object.keys(GARMENT_CATALOG);
}

/**
 * Returns all styles associated with a specific brand.
 */
export function getStylesByBrand(brandId: string): GarmentStyle[] {
  const brand = GARMENT_CATALOG[brandId];
  if (!brand) return [];
  return Object.values(brand.styles);
}

/**
 * Returns the available colors for a specific brand and style combination.
 */
export function getColorsByBrandAndStyle(brandId: string, styleId: string): string[] {
  return GARMENT_CATALOG[brandId]?.styles[styleId]?.colors ?? [];
}

/**
 * Returns the available sizes for a specific brand and style combination.
 */
export function getSizesByBrandAndStyle(brandId: string, styleId: string): string[] {
  return GARMENT_CATALOG[brandId]?.styles[styleId]?.sizes ?? [];
}

/**
 * Returns the full detailed information for a specific garment style.
 */
export function getStyleDetails(brandId: string, styleId: string): GarmentStyle | undefined {
  return GARMENT_CATALOG[brandId]?.styles[styleId];
}

/**
 * Generates a standardized description string for a garment order.
 * Example: "25x Gildan 5000 Heavy Cotton T-Shirt - Black - Size M - 5.3oz 100% Cotton"
 */
export function generateGarmentDescription(
  brand: string,
  styleId: string,
  color: string,
  size: string,
  quantity: number
): string {
  const style = getStyleDetails(brand, styleId);
  if (!style) return `${quantity}x Unknown Garment - ${color} - Size ${size}`;

  return `${quantity}x ${brand} ${style.styleNumber} ${style.styleName} - ${color} - Size ${size} - ${style.weight} ${style.fabric}`;
}
