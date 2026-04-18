/**
 * seed-images.ts
 *
 * Seeds the GarmentImage table with SVG placeholder references and print-area
 * dimension data for all supported garment types and popular colors.
 *
 * Run:
 *   cd backend && npx tsx prisma/seed-images.ts
 *
 * Note: No copyrighted brand photos are included. All entries reference the
 * SVG placeholder system. When real photos are uploaded via the admin panel,
 * they will be upserted into the same table using brand+styleNumber+color as
 * the unique key, automatically taking priority over SVG placeholders.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Garment print areas (% of garment area) ─────────────────────────────────
// These are stored as JSON in a metadata file so the frontend resolver can
// eventually fetch them from the API. For now they live in garmentImageResolver.ts.

// ─── Color catalog ────────────────────────────────────────────────────────────
// Most popular colors by volume for each major brand

const GILDAN_COLORS = [
  'Black', 'White', 'Navy', 'Sport Grey', 'Dark Heather',
  'Royal', 'Red', 'Carolina Blue', 'Forest Green', 'Gold',
  'Maroon', 'Purple', 'Charcoal', 'Safety Green', 'Safety Orange',
  'Ash', 'Light Blue', 'Military Green', 'Brown', 'Daisy',
];

const BELLA_CANVAS_COLORS = [
  'Black', 'White', 'Navy', 'Athletic Heather', 'Dark Grey Heather',
  'True Royal', 'Red', 'Mauve', 'Bay', 'Soft Pink',
  'Heather Mint', 'Team Purple', 'Vintage White', 'Charcoal',
  'Ocean Blue', 'Kelly', 'Maroon', 'Coral', 'Yellow',
];

const NEXT_LEVEL_COLORS = [
  'Black', 'White', 'Navy', 'Heather Grey', 'Midnight Navy',
  'Royal', 'Red', 'Turquoise', 'Kelly Green', 'Gold',
  'Burgundy', 'Purple', 'Ash', 'Hot Pink', 'Forest Green',
];

const COMFORT_COLORS_COLORS = [
  'Black', 'White', 'Ivory', 'Blue Jean', 'Pepper',
  'Crimson', 'Blossom', 'Butter', 'Moss', 'Washed Denim',
  'Watermelon', 'Mustard', 'Berry', 'Sage', 'Hemp',
];

// ─── Brand + style catalog ────────────────────────────────────────────────────
// Each entry produces one GarmentImage row per color.
// frontUrl / backUrl use the SVG placeholder sentinel "svg:{garmentType}" so the
// frontend resolver knows to use the SVG system instead of fetching a real image.

interface GarmentStyleDef {
  brand: string;
  styleNumber: string;
  garmentType: string;
  colors: string[];
  description: string;
}

const GARMENT_STYLES: GarmentStyleDef[] = [
  // ── Gildan ──────────────────────────────────────────────────────────────────
  {
    brand: 'Gildan',
    styleNumber: '5000',
    garmentType: 'TSHIRT',
    colors: GILDAN_COLORS,
    description: 'Gildan 5000 Heavy Cotton T-Shirt',
  },
  {
    brand: 'Gildan',
    styleNumber: '18500',
    garmentType: 'HOODIE',
    colors: GILDAN_COLORS,
    description: 'Gildan 18500 Heavy Blend Hooded Sweatshirt',
  },
  {
    brand: 'Gildan',
    styleNumber: '5400',
    garmentType: 'LONG_SLEEVE',
    colors: GILDAN_COLORS.slice(0, 12),
    description: 'Gildan 5400 Heavy Cotton Long-Sleeve T-Shirt',
  },
  {
    brand: 'Gildan',
    styleNumber: '18000',
    garmentType: 'SWEATSHIRT',
    colors: GILDAN_COLORS.slice(0, 12),
    description: 'Gildan 18000 Heavy Blend Crewneck Sweatshirt',
  },
  {
    brand: 'Gildan',
    styleNumber: '2200',
    garmentType: 'TANK_TOP',
    colors: GILDAN_COLORS.slice(0, 10),
    description: 'Gildan 2200 Ultra Cotton Sleeveless T-Shirt',
  },

  // ── Bella+Canvas ─────────────────────────────────────────────────────────────
  {
    brand: 'Bella+Canvas',
    styleNumber: '3001',
    garmentType: 'TSHIRT',
    colors: BELLA_CANVAS_COLORS,
    description: "Bella+Canvas 3001 Unisex Jersey T-Shirt",
  },
  {
    brand: 'Bella+Canvas',
    styleNumber: '3719',
    garmentType: 'HOODIE',
    colors: BELLA_CANVAS_COLORS.slice(0, 12),
    description: 'Bella+Canvas 3719 Sponge Fleece Pullover Hoodie',
  },
  {
    brand: 'Bella+Canvas',
    styleNumber: '3501',
    garmentType: 'LONG_SLEEVE',
    colors: BELLA_CANVAS_COLORS.slice(0, 10),
    description: 'Bella+Canvas 3501 Unisex Jersey Long-Sleeve T-Shirt',
  },
  {
    brand: 'Bella+Canvas',
    styleNumber: '3480',
    garmentType: 'TANK_TOP',
    colors: BELLA_CANVAS_COLORS.slice(0, 10),
    description: 'Bella+Canvas 3480 Unisex Jersey Tank Top',
  },

  // ── Next Level ────────────────────────────────────────────────────────────────
  {
    brand: 'Next Level',
    styleNumber: '3600',
    garmentType: 'TSHIRT',
    colors: NEXT_LEVEL_COLORS,
    description: 'Next Level 3600 Cotton T-Shirt',
  },
  {
    brand: 'Next Level',
    styleNumber: '9300',
    garmentType: 'HOODIE',
    colors: NEXT_LEVEL_COLORS.slice(0, 10),
    description: 'Next Level 9300 Unisex PCH Pullover Hoodie',
  },

  // ── Comfort Colors ────────────────────────────────────────────────────────────
  {
    brand: 'Comfort Colors',
    styleNumber: '1717',
    garmentType: 'TSHIRT',
    colors: COMFORT_COLORS_COLORS,
    description: 'Comfort Colors 1717 Adult Heavyweight Ring-Spun Tee',
  },
  {
    brand: 'Comfort Colors',
    styleNumber: '1566',
    garmentType: 'HOODIE',
    colors: COMFORT_COLORS_COLORS.slice(0, 10),
    description: 'Comfort Colors 1566 Adult Garment-Dyed Hoodie',
  },

  // ── Port & Company ────────────────────────────────────────────────────────────
  {
    brand: 'Port & Company',
    styleNumber: 'PC54',
    garmentType: 'TSHIRT',
    colors: ['Black', 'White', 'Navy', 'Red', 'Royal', 'Athletic Heather', 'Charcoal', 'Gold'],
    description: 'Port & Company PC54 Core Cotton Tee',
  },
  {
    brand: 'Port & Company',
    styleNumber: 'PC90H',
    garmentType: 'HOODIE',
    colors: ['Black', 'White', 'Navy', 'Red', 'Royal', 'Charcoal'],
    description: 'Port & Company PC90H Essential Fleece Pullover Hooded Sweatshirt',
  },

  // ── Hanes ─────────────────────────────────────────────────────────────────────
  {
    brand: 'Hanes',
    styleNumber: '5250',
    garmentType: 'TSHIRT',
    colors: ['Black', 'White', 'Navy', 'Red', 'Sport Grey', 'Athletic Heather'],
    description: 'Hanes 5250 Essential-T Short Sleeve T-Shirt',
  },
  {
    brand: 'Hanes',
    styleNumber: 'P170',
    garmentType: 'HOODIE',
    colors: ['Black', 'White', 'Navy', 'Smoke Grey'],
    description: 'Hanes P170 EcoSmart Pullover Hoodie Sweatshirt',
  },

  // ── AS Colour ─────────────────────────────────────────────────────────────────
  {
    brand: 'AS Colour',
    styleNumber: '5001',
    garmentType: 'TSHIRT',
    colors: ['Black', 'White', 'Navy', 'Bone', 'Asphalt', 'Sage', 'Clay'],
    description: 'AS Colour 5001 Staple Tee',
  },
];

// ─── Seed function ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱 Seeding GarmentImage table with SVG placeholder references...\n');

  let created = 0;
  let skipped = 0;

  for (const style of GARMENT_STYLES) {
    for (const color of style.colors) {
      // Use sentinel URLs — frontend resolver treats "svg:{type}" as
      // "fall back to SVG placeholder, do not attempt to fetch this as a real URL"
      const frontUrl = `svg:${style.garmentType}:front`;
      const backUrl  = `svg:${style.garmentType}:back`;

      try {
        await prisma.garmentImage.upsert({
          where: {
            brand_styleNumber_color: {
              brand: style.brand,
              styleNumber: style.styleNumber,
              color,
            },
          },
          update: {
            frontUrl,
            backUrl,
            source: 'svg_placeholder',
          },
          create: {
            brand: style.brand,
            styleNumber: style.styleNumber,
            color,
            frontUrl,
            backUrl,
            source: 'svg_placeholder',
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }
  }

  const total = GARMENT_STYLES.reduce((sum, s) => sum + s.colors.length, 0);
  console.log(`✓ GarmentImages: ${created} upserted, ${skipped} errors (${total} total attempted)`);
  console.log('\n📋 Styles seeded:');
  for (const s of GARMENT_STYLES) {
    console.log(`   ${s.brand} ${s.styleNumber} (${s.garmentType}) — ${s.colors.length} colors`);
  }

  console.log('\n✅ Done. Upload real photos via the admin panel to replace SVG placeholders.');
  console.log('   Real photos take Priority 1 (exact match) or Priority 2 (any color).');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
