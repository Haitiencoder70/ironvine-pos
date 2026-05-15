/**
 * Marketing Demo Data Seed
 *
 * Seeds polished fictional data into one target organization so we can
 * capture clean landing-page screenshots without exposing real customer data.
 *
 * Usage:
 *   MARKETING_DEMO_ORG_SLUG=demo-print-shop npx tsx src/scripts/seed-marketing-demo.ts
 *
 * The value can be a slug, subdomain, or org name (case-insensitive).
 * If no match is found, the script lists all available organizations.
 *
 * Safety:
 *   - Only touches records in the target org
 *   - Only deletes records tagged with [MARKETING DEMO] / DEMO- prefix / demo+ emails
 *   - Will NOT create an org or Clerk user
 *   - Idempotent: safe to re-run
 */

import {
  PrismaClient,
  StockMovementType,
  PrintLocation,
  ShipmentCarrier,
} from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_TAG = '[MARKETING DEMO]';
const DEMO_EMAIL_PREFIX = 'demo+';
const DEMO_SKU_PREFIX = 'DEMO-';
const DEMO_PRODUCT_SKU_PREFIX = 'DEMO-PROD-';
const DEMO_ORDER_PREFIX = 'DEMO-ORD-';
const DEMO_PO_PREFIX = 'DEMO-PO-';

// ─── Fixture Data ──────────────────────────────────────────────────────────────

const VENDOR_DATA = [
  {
    name: 'S&S Activewear (Demo)',
    contactName: 'Sales Dept',
    email: 'demo+ssactivewear@printflowpos.com',
    phone: '(800) 555-0101',
    categories: ['BLANK_SHIRTS'],
    paymentTerms: 'Net 30',
    leadTimeDays: 5,
    notes: `${DEMO_TAG} Primary blank garment supplier. Stocks Gildan, Bella+Canvas, Next Level, Comfort Colors.`,
  },
  {
    name: 'DTF Transfers Pro (Demo)',
    contactName: 'Ordering Team',
    email: 'demo+dtftransfers@printflowpos.com',
    phone: '(305) 555-0102',
    categories: ['DTF_TRANSFERS'],
    paymentTerms: 'Net 15',
    leadTimeDays: 3,
    notes: `${DEMO_TAG} Gang sheets and single transfers. Rush available for +30%.`,
  },
  {
    name: 'Siser North America (Demo)',
    contactName: 'Sales Support',
    email: 'demo+siser@printflowpos.com',
    phone: '(972) 555-0103',
    categories: ['VINYL'],
    paymentTerms: 'Net 30',
    leadTimeDays: 7,
    notes: `${DEMO_TAG} Siser EasyWeed, Glitter, Holographic product line.`,
  },
];

const CUSTOMER_DATA = [
  { firstName: 'Marcus',    lastName: 'Rivera',    email: 'demo+riverbend@printflowpos.com',   phone: '214-555-1001', company: 'Riverbend Athletics',       shippingStreet: '100 Stadium Dr',    shippingCity: 'Dallas',       shippingState: 'TX', shippingZip: '75201' },
  { firstName: 'Priya',     lastName: 'Mehta',     email: 'demo+oakwood@printflowpos.com',     phone: '214-555-1002', company: 'Oakwood Brewing Company',   shippingStreet: '42 Taproom Ln',     shippingCity: 'Fort Worth',   shippingState: 'TX', shippingZip: '76102' },
  { firstName: 'Pastor',    lastName: 'Robinson',  email: 'demo+valleyview@printflowpos.com',  phone: '214-555-1003', company: 'Valley View Church',        shippingStreet: '789 Faith Ave',     shippingCity: 'Plano',        shippingState: 'TX', shippingZip: '75023' },
  { firstName: 'Jake',      lastName: 'Nguyen',    email: 'demo+summit@printflowpos.com',      phone: '214-555-1004', company: 'Summit CrossFit',           shippingStreet: '500 Iron Way',      shippingCity: 'Dallas',       shippingState: 'TX', shippingZip: '75212' },
  { firstName: 'Principal', lastName: 'Washington', email: 'demo+lakeside@printflowpos.com',   phone: '214-555-1005', company: 'Lakeside Elementary',        shippingStreet: '321 School Rd',     shippingCity: 'Dallas',       shippingState: 'TX', shippingZip: '75204' },
  { firstName: 'Sofia',     lastName: 'Torres',    email: 'demo+coastal@printflowpos.com',     phone: '214-555-1006', company: 'Coastal Catering Co',       shippingStreet: '88 Harbor Blvd',    shippingCity: 'Dallas',       shippingState: 'TX', shippingZip: '75202' },
  { firstName: 'Angela',    lastName: 'Torres',    email: 'demo+torresfamily@printflowpos.com', phone: '214-555-1007', company: 'Torres Family Reunion 2025', shippingStreet: '155 Park Cir',      shippingCity: 'Dallas',       shippingState: 'TX', shippingZip: '75201' },
];

type InvSpec = {
  sku: string; name: string; category: string;
  brand?: string; size?: string; color?: string;
  qoh: number; rp: number; rq: number; cost: number;
};

const INVENTORY_DATA: InvSpec[] = [
  // ── Blanks ──
  { sku: 'DEMO-GILD5000-BLK-M',     name: 'Gildan 5000 Heavy Cotton Tee - Black M',          category: 'BLANK_SHIRTS',  brand: 'Gildan',        size: 'M',   color: 'Black',          qoh: 82,  rp: 25, rq: 100, cost: 3.50 },
  { sku: 'DEMO-GILD5000-BLK-L',     name: 'Gildan 5000 Heavy Cotton Tee - Black L',          category: 'BLANK_SHIRTS',  brand: 'Gildan',        size: 'L',   color: 'Black',          qoh: 64,  rp: 25, rq: 100, cost: 3.50 },
  { sku: 'DEMO-GILD5000-WHT-M',     name: 'Gildan 5000 Heavy Cotton Tee - White M',          category: 'BLANK_SHIRTS',  brand: 'Gildan',        size: 'M',   color: 'White',          qoh: 47,  rp: 25, rq: 100, cost: 3.50 },
  { sku: 'DEMO-BC3001-BLK-M',       name: 'Bella+Canvas 3001 Unisex Jersey Tee - Black M',   category: 'BLANK_SHIRTS',  brand: 'Bella+Canvas',  size: 'M',   color: 'Black',          qoh: 9,   rp: 20, rq: 100, cost: 4.25 },  // low stock
  { sku: 'DEMO-BC3001-WHT-M',       name: 'Bella+Canvas 3001 Unisex Jersey Tee - White M',   category: 'BLANK_SHIRTS',  brand: 'Bella+Canvas',  size: 'M',   color: 'White',          qoh: 31,  rp: 20, rq: 100, cost: 4.25 },
  { sku: 'DEMO-GILD2000-SORA-XL',   name: 'Gildan 2000 Ultra Cotton Tee - Safety Orange XL', category: 'BLANK_SHIRTS',  brand: 'Gildan',        size: 'XL',  color: 'Safety Orange',  qoh: 0,   rp: 20, rq: 100, cost: 3.75 },  // out of stock
  { sku: 'DEMO-NL3600-HTH-M',       name: 'Next Level 3600 Unisex Cotton Tee - Heather M',   category: 'BLANK_SHIRTS',  brand: 'Next Level',    size: 'M',   color: 'Heather Grey',   qoh: 14,  rp: 20, rq: 100, cost: 3.75 },  // low stock
  // ── DTF Transfers ──
  { sku: 'DEMO-DTF-GANG-22x60',     name: 'DTF Gang Sheet 22"x60" - Hot Peel Matte',         category: 'DTF_TRANSFERS', qoh: 4,   rp: 5,  rq: 20, cost: 30.00 },  // low stock
  { sku: 'DEMO-DTF-SNG-12x14',      name: 'DTF Single Transfer 12"x14" - Hot Peel Matte',    category: 'DTF_TRANSFERS', qoh: 12,  rp: 10, rq: 50, cost: 6.00 },
  // ── HTV Vinyl ──
  { sku: 'DEMO-SISR-EW-BLK',        name: 'Siser EasyWeed HTV - Black 12"x5yd',              category: 'VINYL',         brand: 'Siser', size: '12"x5yd', color: 'Black',   qoh: 3,   rp: 2,  rq: 5,  cost: 22.00 },
  { sku: 'DEMO-SISR-EW-WHT',        name: 'Siser EasyWeed HTV - White 12"x5yd',              category: 'VINYL',         brand: 'Siser', size: '12"x5yd', color: 'White',   qoh: 2,   rp: 2,  rq: 5,  cost: 22.00 },  // low stock
  { sku: 'DEMO-SISR-GLT-GLD',       name: 'Siser Glitter HTV - Gold 12"x12" Sheet',          category: 'VINYL',         brand: 'Siser', size: '12"x12"', color: 'Gold',    qoh: 7,   rp: 5,  rq: 10, cost: 4.00 },
  // ── Packaging / Supplies ──
  { sku: 'DEMO-POLY-14x19',         name: 'Poly Mailers 14.5"x19" (100-pack)',                category: 'PACKAGING',     size: '14.5"x19"', qoh: 38,  rp: 50, rq: 200, cost: 0.14 },  // low stock
  { sku: 'DEMO-PARCH-16x20',        name: 'Parchment Paper 16"x20" (100-pack)',               category: 'PACKAGING',     size: '16"x20"',   qoh: 180, rp: 50, rq: 100, cost: 0.12 },
  { sku: 'DEMO-EMBR-BLK-5000M',     name: 'Embroidery Thread - Black 5000m Cone',             category: 'EMBROIDERY_THREAD', brand: 'Madeira', color: 'Black', qoh: 3, rp: 2, rq: 6, cost: 8.50 },
];

type OrderItemSpec = {
  productType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  printMethod?: string;
  printLocations?: string[];
};

type OrderSpec = {
  orderNumber: string;
  customerIdx: number;
  status: string;
  priority: string;
  dueDaysFromNow: number;
  notes: string;
  items: OrderItemSpec[];
};

// Due dates relative to "now" so screenshots always look fresh
const ORDER_SPECS: OrderSpec[] = [
  // ─ RUSH — In Production ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}001`, customerIdx: 0, status: 'IN_PRODUCTION', priority: 'RUSH', dueDaysFromNow: 2,
    notes: `${DEMO_TAG} 50x black tees DTF front & back for Riverbend Athletics league kickoff. Rush job — due in 2 days.`,
    items: [
      { productType: 'TSHIRT', description: '50x Gildan 5000 Black Tee - Mixed Sizes | DTF Front (League Logo 12"x14") + Back (Player Names)', quantity: 50, unitPrice: 18.00, printMethod: 'DTF', printLocations: ['FRONT', 'BACK'] },
    ],
  },
  // ─ HIGH — Materials Received, ready to start printing ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}002`, customerIdx: 1, status: 'MATERIALS_RECEIVED', priority: 'HIGH', dueDaysFromNow: 5,
    notes: `${DEMO_TAG} 24x white hoodies screen print for Oakwood Brewing taproom staff.`,
    items: [
      { productType: 'HOODIE', description: '24x White Hoodie - Mixed Sizes | Screen Print Front (Brewery Logo 10"x10")', quantity: 24, unitPrice: 38.00, printMethod: 'SCREEN_PRINT', printLocations: ['FRONT'] },
    ],
  },
  // ─ Ready to Ship ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}003`, customerIdx: 2, status: 'READY_TO_SHIP', priority: 'NORMAL', dueDaysFromNow: 1,
    notes: `${DEMO_TAG} 100x church VBS tees. Printed and QC passed. Waiting for pickup.`,
    items: [
      { productType: 'TSHIRT', description: '100x Bella+Canvas 3001 White Tee - Mixed Sizes | DTF Front (VBS 2025 Design 10"x12")', quantity: 100, unitPrice: 14.00, printMethod: 'DTF', printLocations: ['FRONT'] },
    ],
  },
  // ─ Quality Check ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}004`, customerIdx: 3, status: 'QUALITY_CHECK', priority: 'HIGH', dueDaysFromNow: 3,
    notes: `${DEMO_TAG} Summit CrossFit comp tees + hoodies. Checking print alignment on hoodies.`,
    items: [
      { productType: 'TSHIRT', description: '30x Bella+Canvas 3001 Black Tee - Mixed Sizes | HTV Front (Gym Logo 8"x8" White)', quantity: 30, unitPrice: 22.00, printMethod: 'HTV', printLocations: ['FRONT'] },
      { productType: 'HOODIE', description: '15x Black Hoodie - Mixed Sizes | HTV Front (Gym Logo 8"x8" White)', quantity: 15, unitPrice: 45.00, printMethod: 'HTV', printLocations: ['FRONT'] },
    ],
  },
  // ─ Shipped ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}005`, customerIdx: 4, status: 'SHIPPED', priority: 'NORMAL', dueDaysFromNow: -2,
    notes: `${DEMO_TAG} 200x school spirit tees shipped via USPS. Tracking active.`,
    items: [
      { productType: 'TSHIRT', description: '200x Gildan 5000 Cardinal Red Tee - Mixed Sizes | DTF Front (Mascot 10"x12") + Back (LAKESIDE LIONS)', quantity: 200, unitPrice: 13.50, printMethod: 'DTF', printLocations: ['FRONT', 'BACK'] },
    ],
  },
  // ─ Approved — awaiting material order ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}006`, customerIdx: 5, status: 'APPROVED', priority: 'NORMAL', dueDaysFromNow: 10,
    notes: `${DEMO_TAG} Coastal Catering staff polos with embroidered logo. Need to order blanks.`,
    items: [
      { productType: 'POLO', description: '12x Navy Polo - Mixed Sizes | Embroidery Left Chest (Company Logo 3.5"x3.5")', quantity: 12, unitPrice: 32.00, printMethod: 'EMBROIDERY', printLocations: ['FRONT'] },
    ],
  },
  // ─ Quote ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}007`, customerIdx: 6, status: 'QUOTE', priority: 'NORMAL', dueDaysFromNow: 21,
    notes: `${DEMO_TAG} Torres family reunion tees — customer reviewing quote. 35 adults + 10 kids.`,
    items: [
      { productType: 'TSHIRT', description: '35x Comfort Colors 1717 Butter Tee - Adult Sizes | DTF Front (Family Crest 10"x12") + Back (Names & Date)', quantity: 35, unitPrice: 20.00, printMethod: 'DTF', printLocations: ['FRONT', 'BACK'] },
      { productType: 'TSHIRT', description: '10x Comfort Colors 9018 Butter Youth Tee | DTF Front (Family Crest 8"x10")', quantity: 10, unitPrice: 16.00, printMethod: 'DTF', printLocations: ['FRONT'] },
    ],
  },
  // ─ Materials Ordered ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}008`, customerIdx: 0, status: 'MATERIALS_ORDERED', priority: 'NORMAL', dueDaysFromNow: 8,
    notes: `${DEMO_TAG} Riverbend Athletics second run — away jerseys. PO sent to S&S for grey blanks.`,
    items: [
      { productType: 'TSHIRT', description: '50x Next Level 3600 Heather Grey Tee - Mixed Sizes | DTF Front (Away Logo 12"x14")', quantity: 50, unitPrice: 17.00, printMethod: 'DTF', printLocations: ['FRONT'] },
    ],
  },
  // ─ Completed (recent) ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}009`, customerIdx: 1, status: 'COMPLETED', priority: 'NORMAL', dueDaysFromNow: -7,
    notes: `${DEMO_TAG} Oakwood Brewing promo tees — delivered and paid.`,
    items: [
      { productType: 'TSHIRT', description: '20x Gildan 5000 Black Tee - Mixed Sizes | DTF Front (Craft Beer Fest 2025 10"x12")', quantity: 20, unitPrice: 16.00, printMethod: 'DTF', printLocations: ['FRONT'] },
    ],
  },
  // ─ Delivered ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}010`, customerIdx: 3, status: 'DELIVERED', priority: 'NORMAL', dueDaysFromNow: -5,
    notes: `${DEMO_TAG} Summit CrossFit sample run — 5 tees for coach approval.`,
    items: [
      { productType: 'TSHIRT', description: '5x Bella+Canvas 3001 Black Tee - Size L | HTV Front (Gym Logo 8"x8" White)', quantity: 5, unitPrice: 25.00, printMethod: 'HTV', printLocations: ['FRONT'] },
    ],
  },
  // ─ HTV — In Production, normal ─
  {
    orderNumber: `${DEMO_ORDER_PREFIX}011`, customerIdx: 5, status: 'IN_PRODUCTION', priority: 'NORMAL', dueDaysFromNow: 4,
    notes: `${DEMO_TAG} Coastal Catering event tees — HTV names on back.`,
    items: [
      { productType: 'TSHIRT', description: '18x Gildan 5000 White Tee - Mixed Sizes | HTV Front (Logo 6"x6" Black) + Back (Staff Name)', quantity: 18, unitPrice: 20.00, printMethod: 'HTV', printLocations: ['FRONT', 'BACK'] },
    ],
  },
];

type POSpec = {
  poNumber: string;
  vendorIdx: number;
  orderNumber: string;
  status: string;
  items: { description: string; qty: number; cost: number }[];
};

const PO_SPECS: POSpec[] = [
  {
    poNumber: `${DEMO_PO_PREFIX}001`, vendorIdx: 0, orderNumber: `${DEMO_ORDER_PREFIX}002`, status: 'RECEIVED',
    items: [
      { description: '24x White Hoodie Blanks - Mixed Sizes', qty: 24, cost: 14.00 },
    ],
  },
  {
    poNumber: `${DEMO_PO_PREFIX}002`, vendorIdx: 0, orderNumber: `${DEMO_ORDER_PREFIX}008`, status: 'SENT',
    items: [
      { description: '50x Next Level 3600 Heather Grey Tee - Mixed Sizes', qty: 50, cost: 3.75 },
    ],
  },
  {
    poNumber: `${DEMO_PO_PREFIX}003`, vendorIdx: 1, orderNumber: `${DEMO_ORDER_PREFIX}005`, status: 'RECEIVED',
    items: [
      { description: '20x DTF Gang Sheet 22"x60" - Lakeside Lions Front + Back', qty: 20, cost: 30.00 },
    ],
  },
];

const SHIPMENT_SPECS = [
  { orderNumber: `${DEMO_ORDER_PREFIX}005`, tracking: 'DEMO9400111899223100005678', carrier: 'USPS' as ShipmentCarrier, status: 'IN_TRANSIT' },
  { orderNumber: `${DEMO_ORDER_PREFIX}009`, tracking: 'DEMO1Z999AA10123456780001', carrier: 'UPS' as ShipmentCarrier,  status: 'DELIVERED' },
];

// ─── Product Categories & Products ────────────────────────────────────────────

const CATEGORY_SPECS = [
  { name: 'DTF Transfer',         description: 'Direct-to-Film heat transfer printing — full color, no minimums', icon: '🖨️',  displayOrder: 1 },
  { name: 'Screen Print',         description: 'Traditional ink-on-garment screen printing — best for bulk runs',  icon: '🎨',  displayOrder: 2 },
  { name: 'Heat Transfer Vinyl',  description: 'Cut vinyl applied with a heat press — great for names & numbers',  icon: '✂️',  displayOrder: 3 },
  { name: 'Embroidery',           description: 'Stitched logos — professional look for polos and caps',            icon: '🧵',  displayOrder: 4 },
  { name: 'Sublimation',          description: 'Dye-sublimation for polyester performance garments',                icon: '🌈',  displayOrder: 5 },
  { name: 'Direct-to-Garment',    description: 'Inkjet printing directly on fabric — photo-quality detail',        icon: '👕',  displayOrder: 6 },
  { name: 'Accessories',          description: 'Bags, hats, and other customizable items',                          icon: '👜',  displayOrder: 7 },
] as const;

type PriceTier = { minQty: number; price: number };
type SizeUpcharges = Record<string, number>;

type MaterialTemplateSpec = {
  materialCategory: string;
  description: string;
  quantityPerUnit: number;
  estimatedCostPerUnit: number;
  inventorySku?: string;
};

type ProductSpec = {
  sku: string;
  name: string;
  description: string;
  categoryName: string;
  garmentType: string;
  printMethod: string;
  includedPrintLocations: string[];
  maxPrintLocations: number;
  basePrice: number;
  priceTiers: PriceTier[];
  sizeUpcharges: SizeUpcharges;
  availableBrands: string[];
  availableSizes: string[];
  availableColors: string[];
  estimatedProductionMinutes: number;
  difficultyLevel: string;
  isFeatured: boolean;
  materialTemplates: MaterialTemplateSpec[];
};

const PRODUCT_SPECS: ProductSpec[] = [
  {
    sku: `${DEMO_PRODUCT_SKU_PREFIX}DTF-TEE`,
    name: 'Classic DTF T-Shirt',
    description: 'Full-color direct-to-film print on a premium unisex tee. No minimum order. Perfect for events, teams, and promos.',
    categoryName: 'DTF Transfer',
    garmentType: 'TSHIRT',
    printMethod: 'DTF',
    includedPrintLocations: ['FRONT'],
    maxPrintLocations: 3,
    basePrice: 15.00,
    priceTiers: [
      { minQty: 1,  price: 18.00 },
      { minQty: 12, price: 15.00 },
      { minQty: 24, price: 13.00 },
      { minQty: 50, price: 11.00 },
    ],
    sizeUpcharges: { '2XL': 2.00, '3XL': 3.00 },
    availableBrands: ['Gildan 5000', 'Bella+Canvas 3001', 'Next Level 3600', 'Comfort Colors 1717'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    availableColors: ['Black', 'White', 'Navy', 'Heather Grey', 'Red', 'Royal Blue', 'Forest Green', 'Cardinal'],
    estimatedProductionMinutes: 8,
    difficultyLevel: 'Beginner',
    isFeatured: true,
    materialTemplates: [
      { materialCategory: 'BLANK_GARMENT', description: 'Gildan 5000 blank tee (per unit)', quantityPerUnit: 1, estimatedCostPerUnit: 3.50, inventorySku: 'DEMO-GILD5000-BLK-M' },
      { materialCategory: 'DTF_TRANSFER',  description: 'DTF transfer (1/10 gang sheet per print)', quantityPerUnit: 0.1, estimatedCostPerUnit: 3.00, inventorySku: 'DEMO-DTF-GANG-22x60' },
    ],
  },
  {
    sku: `${DEMO_PRODUCT_SKU_PREFIX}SP-HOODIE`,
    name: 'Premium Screen Print Hoodie',
    description: 'Crisp, durable screen print on a heavyweight hoodie. Minimum 12 pieces per color. Best value for large runs.',
    categoryName: 'Screen Print',
    garmentType: 'HOODIE',
    printMethod: 'SCREEN_PRINT',
    includedPrintLocations: ['FRONT'],
    maxPrintLocations: 2,
    basePrice: 38.00,
    priceTiers: [
      { minQty: 12, price: 42.00 },
      { minQty: 24, price: 38.00 },
      { minQty: 50, price: 34.00 },
      { minQty: 72, price: 30.00 },
    ],
    sizeUpcharges: { '2XL': 3.00, '3XL': 5.00 },
    availableBrands: ['Gildan 18500', 'Bella+Canvas 3719', 'Independent Trading SS4500'],
    availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    availableColors: ['Black', 'White', 'Navy', 'Sport Grey', 'Carolina Blue'],
    estimatedProductionMinutes: 25,
    difficultyLevel: 'Intermediate',
    isFeatured: true,
    materialTemplates: [
      { materialCategory: 'BLANK_GARMENT', description: 'Blank hoodie (per unit)', quantityPerUnit: 1, estimatedCostPerUnit: 14.00 },
    ],
  },
  {
    sku: `${DEMO_PRODUCT_SKU_PREFIX}EMBR-POLO`,
    name: 'Embroidered Polo',
    description: 'Professional left-chest logo embroidery on a moisture-wicking polo. Ideal for corporate, hospitality, and service teams.',
    categoryName: 'Embroidery',
    garmentType: 'POLO',
    printMethod: 'EMBROIDERY',
    includedPrintLocations: ['FRONT'],
    maxPrintLocations: 2,
    basePrice: 28.00,
    priceTiers: [
      { minQty: 1,  price: 32.00 },
      { minQty: 6,  price: 28.00 },
      { minQty: 12, price: 26.00 },
      { minQty: 24, price: 24.00 },
    ],
    sizeUpcharges: { 'XL': 2.00, '2XL': 4.00, '3XL': 6.00 },
    availableBrands: ['Port Authority K500', 'OGIO Limit Polo', 'Harriton M200'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    availableColors: ['Black', 'White', 'Navy', 'Royal Blue', 'Burgundy', 'Dark Green'],
    estimatedProductionMinutes: 18,
    difficultyLevel: 'Intermediate',
    isFeatured: false,
    materialTemplates: [
      { materialCategory: 'BLANK_GARMENT',      description: 'Blank polo (per unit)', quantityPerUnit: 1, estimatedCostPerUnit: 12.00 },
      { materialCategory: 'EMBROIDERY_THREAD',   description: 'Embroidery thread (per logo stitch, ~5000 stitches)', quantityPerUnit: 0.05, estimatedCostPerUnit: 0.43, inventorySku: 'DEMO-EMBR-BLK-5000M' },
    ],
  },
  {
    sku: `${DEMO_PRODUCT_SKU_PREFIX}HTV-TEE`,
    name: 'HTV Staff Tee',
    description: 'Cut vinyl on a cotton tee — perfect for staff uniforms, names on back, or simple 1-color logos.',
    categoryName: 'Heat Transfer Vinyl',
    garmentType: 'TSHIRT',
    printMethod: 'HTV',
    includedPrintLocations: ['FRONT'],
    maxPrintLocations: 3,
    basePrice: 14.00,
    priceTiers: [
      { minQty: 1,  price: 20.00 },
      { minQty: 6,  price: 17.00 },
      { minQty: 12, price: 14.00 },
      { minQty: 24, price: 12.00 },
    ],
    sizeUpcharges: { '2XL': 2.00, '3XL': 3.00 },
    availableBrands: ['Gildan 5000', 'Bella+Canvas 3001'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    availableColors: ['Black', 'White', 'Navy', 'Red', 'Safety Orange', 'Forest Green'],
    estimatedProductionMinutes: 12,
    difficultyLevel: 'Beginner',
    isFeatured: false,
    materialTemplates: [
      { materialCategory: 'BLANK_GARMENT', description: 'Blank tee (per unit)', quantityPerUnit: 1, estimatedCostPerUnit: 3.50, inventorySku: 'DEMO-GILD5000-WHT-M' },
      { materialCategory: 'HTV_VINYL',     description: 'Siser EasyWeed HTV (per print, approx 0.03yd per shirt)', quantityPerUnit: 0.03, estimatedCostPerUnit: 0.66, inventorySku: 'DEMO-SISR-EW-BLK' },
    ],
  },
  {
    sku: `${DEMO_PRODUCT_SKU_PREFIX}DTF-YOUTH`,
    name: 'Youth Team Shirt',
    description: 'DTF print on youth-sized tees — great for school teams, youth sports, and camps. Same full-color quality, kid-friendly sizing.',
    categoryName: 'DTF Transfer',
    garmentType: 'TSHIRT',
    printMethod: 'DTF',
    includedPrintLocations: ['FRONT'],
    maxPrintLocations: 2,
    basePrice: 12.00,
    priceTiers: [
      { minQty: 1,  price: 16.00 },
      { minQty: 12, price: 12.00 },
      { minQty: 24, price: 10.00 },
      { minQty: 50, price: 9.00 },
    ],
    sizeUpcharges: {},
    availableBrands: ['Gildan 5000B', 'Bella+Canvas 3001Y'],
    availableSizes: ['XS (4)', 'S (6-8)', 'M (10-12)', 'L (14-16)', 'XL (18-20)'],
    availableColors: ['Black', 'White', 'Navy', 'Red', 'Royal Blue', 'Gold', 'Cardinal'],
    estimatedProductionMinutes: 7,
    difficultyLevel: 'Beginner',
    isFeatured: false,
    materialTemplates: [
      { materialCategory: 'BLANK_GARMENT', description: 'Youth blank tee (per unit)', quantityPerUnit: 1, estimatedCostPerUnit: 2.85 },
      { materialCategory: 'DTF_TRANSFER',  description: 'DTF transfer — youth size (1/12 gang sheet)', quantityPerUnit: 0.083, estimatedCostPerUnit: 2.50, inventorySku: 'DEMO-DTF-GANG-22x60' },
    ],
  },
  {
    sku: `${DEMO_PRODUCT_SKU_PREFIX}DTG-TEE`,
    name: 'Direct-to-Garment Retail Tee',
    description: 'Photo-quality inkjet print on a premium ring-spun cotton tee. Ideal for detailed artwork, gradients, and retail-ready products.',
    categoryName: 'Direct-to-Garment',
    garmentType: 'TSHIRT',
    printMethod: 'DTG',
    includedPrintLocations: ['FRONT'],
    maxPrintLocations: 2,
    basePrice: 22.00,
    priceTiers: [
      { minQty: 1,  price: 28.00 },
      { minQty: 6,  price: 24.00 },
      { minQty: 12, price: 22.00 },
      { minQty: 24, price: 20.00 },
    ],
    sizeUpcharges: { '2XL': 2.00, '3XL': 4.00 },
    availableBrands: ['Bella+Canvas 3001', 'Next Level 3600', 'American Apparel 2001'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    availableColors: ['White', 'Light Blue', 'Natural', 'Heather Grey'],
    estimatedProductionMinutes: 15,
    difficultyLevel: 'Intermediate',
    isFeatured: false,
    materialTemplates: [
      { materialCategory: 'BLANK_GARMENT', description: 'Bella+Canvas 3001 (per unit)', quantityPerUnit: 1, estimatedCostPerUnit: 4.25, inventorySku: 'DEMO-BC3001-WHT-M' },
    ],
  },
  {
    sku: `${DEMO_PRODUCT_SKU_PREFIX}SUBL-PERF`,
    name: 'Sublimated Performance Shirt',
    description: 'All-over dye-sublimation on a moisture-wicking polyester performance shirt. Vivid, permanent color that won\'t crack or peel.',
    categoryName: 'Sublimation',
    garmentType: 'TSHIRT',
    printMethod: 'SUBLIMATION',
    includedPrintLocations: ['FRONT', 'BACK'],
    maxPrintLocations: 4,
    basePrice: 25.00,
    priceTiers: [
      { minQty: 1,  price: 32.00 },
      { minQty: 6,  price: 28.00 },
      { minQty: 12, price: 25.00 },
      { minQty: 24, price: 22.00 },
    ],
    sizeUpcharges: { '2XL': 2.00, '3XL': 4.00 },
    availableBrands: ['Augusta Sportswear 790', 'A4 N3013', 'Badger 4120'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    availableColors: ['White', 'Light Grey (base only)'],
    estimatedProductionMinutes: 20,
    difficultyLevel: 'Advanced',
    isFeatured: false,
    materialTemplates: [
      { materialCategory: 'BLANK_GARMENT', description: 'Polyester performance blank (per unit)', quantityPerUnit: 1, estimatedCostPerUnit: 6.00 },
    ],
  },
  {
    sku: `${DEMO_PRODUCT_SKU_PREFIX}HTV-TOTE`,
    name: 'Custom Tote Bag',
    description: 'HTV or DTF print on a natural canvas tote. Great for events, retail merchandise, and branded giveaways.',
    categoryName: 'Accessories',
    garmentType: 'BAG',
    printMethod: 'HTV',
    includedPrintLocations: ['FRONT'],
    maxPrintLocations: 2,
    basePrice: 12.00,
    priceTiers: [
      { minQty: 1,  price: 16.00 },
      { minQty: 12, price: 12.00 },
      { minQty: 24, price: 10.00 },
      { minQty: 50, price: 8.00 },
    ],
    sizeUpcharges: {},
    availableBrands: ['Liberty Bags 8501', 'Gemline Hampton'],
    availableSizes: ['One Size'],
    availableColors: ['Natural', 'Black', 'Navy'],
    estimatedProductionMinutes: 10,
    difficultyLevel: 'Beginner',
    isFeatured: true,
    materialTemplates: [
      { materialCategory: 'BLANK_GARMENT', description: 'Canvas tote bag (per unit)', quantityPerUnit: 1, estimatedCostPerUnit: 4.00 },
      { materialCategory: 'HTV_VINYL',     description: 'Siser EasyWeed HTV (per bag, approx 0.04yd)', quantityPerUnit: 0.04, estimatedCostPerUnit: 0.88, inventorySku: 'DEMO-SISR-EW-BLK' },
    ],
  },
  {
    sku: `${DEMO_PRODUCT_SKU_PREFIX}DTF-LS`,
    name: 'Long Sleeve Event Shirt',
    description: 'DTF full-color print on a long-sleeve tee — popular for fall events, school spirit, and seasonal promotions.',
    categoryName: 'DTF Transfer',
    garmentType: 'LONG_SLEEVE',
    printMethod: 'DTF',
    includedPrintLocations: ['FRONT'],
    maxPrintLocations: 4,
    basePrice: 20.00,
    priceTiers: [
      { minQty: 1,  price: 24.00 },
      { minQty: 12, price: 20.00 },
      { minQty: 24, price: 17.00 },
      { minQty: 50, price: 15.00 },
    ],
    sizeUpcharges: { '2XL': 2.00, '3XL': 3.00 },
    availableBrands: ['Gildan 5400', 'Bella+Canvas 3501'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    availableColors: ['Black', 'White', 'Navy', 'Heather Grey', 'Forest Green', 'Maroon'],
    estimatedProductionMinutes: 10,
    difficultyLevel: 'Beginner',
    isFeatured: false,
    materialTemplates: [
      { materialCategory: 'BLANK_GARMENT', description: 'Long sleeve blank (per unit)', quantityPerUnit: 1, estimatedCostPerUnit: 5.50 },
      { materialCategory: 'DTF_TRANSFER',  description: 'DTF transfer (1/10 gang sheet per print)', quantityPerUnit: 0.1, estimatedCostPerUnit: 3.00, inventorySku: 'DEMO-DTF-GANG-22x60' },
    ],
  },
  {
    sku: `${DEMO_PRODUCT_SKU_PREFIX}SP-TANK`,
    name: 'Screen Print Tank Top',
    description: 'Classic screen print on a lightweight tank — a summer staple for gyms, races, and outdoor events.',
    categoryName: 'Screen Print',
    garmentType: 'TANK_TOP',
    printMethod: 'SCREEN_PRINT',
    includedPrintLocations: ['FRONT'],
    maxPrintLocations: 2,
    basePrice: 16.00,
    priceTiers: [
      { minQty: 12, price: 18.00 },
      { minQty: 24, price: 16.00 },
      { minQty: 48, price: 13.00 },
      { minQty: 72, price: 11.00 },
    ],
    sizeUpcharges: { '2XL': 2.00 },
    availableBrands: ['Gildan 2200', 'Bella+Canvas 3480', 'Next Level 3633'],
    availableSizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    availableColors: ['Black', 'White', 'Navy', 'Red', 'Gold', 'Royal Blue'],
    estimatedProductionMinutes: 18,
    difficultyLevel: 'Intermediate',
    isFeatured: false,
    materialTemplates: [
      { materialCategory: 'BLANK_GARMENT', description: 'Blank tank top (per unit)', quantityPerUnit: 1, estimatedCostPerUnit: 4.00 },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(17, 0, 0, 0);
  return d;
}

// ─── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const input = process.env['MARKETING_DEMO_ORG_SLUG'];
  if (!input) {
    console.error('ERROR: Set MARKETING_DEMO_ORG_SLUG to the target organization slug, subdomain, or name.');
    console.error('Example: MARKETING_DEMO_ORG_SLUG=demo-print-shop npx tsx src/scripts/seed-marketing-demo.ts');
    process.exit(1);
  }

  // Try slug (exact), then subdomain (exact), then case-insensitive name/slug/subdomain
  const inputLower = input.toLowerCase();
  let org = await prisma.organization.findUnique({ where: { slug: input } });
  if (!org) {
    org = await prisma.organization.findUnique({ where: { subdomain: input } });
  }
  if (!org) {
    org = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug: { equals: inputLower, mode: 'insensitive' } },
          { subdomain: { equals: inputLower, mode: 'insensitive' } },
          { name: { equals: input, mode: 'insensitive' } },
        ],
      },
    });
  }

  if (!org) {
    console.error(`ERROR: No organization found matching "${input}".`);
    console.error('Tried: slug, subdomain, and case-insensitive name match.\n');
    const allOrgs = await prisma.organization.findMany({
      select: { slug: true, subdomain: true, name: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    if (allOrgs.length > 0) {
      console.error('Available organizations:');
      for (const o of allOrgs) {
        console.error(`  slug: ${o.slug}  subdomain: ${o.subdomain}  name: ${o.name}`);
      }
      console.error('\nUse one of these slugs as MARKETING_DEMO_ORG_SLUG.');
    } else {
      console.error('No organizations exist in the database. Create one in the app first.');
    }
    process.exit(1);
  }

  console.log(`Target org: ${org.name} (${org.id}) — slug: ${org.slug} — subdomain: ${org.subdomain}`);
  console.log('');

  // ─── Cleanup existing demo data (child-first order) ─────────────────────────

  console.log('Cleaning up previous demo data...');

  // Find demo orders to cascade-delete their children
  const demoOrders = await prisma.order.findMany({
    where: { organizationId: org.id, orderNumber: { startsWith: DEMO_ORDER_PREFIX } },
    select: { id: true },
  });
  const demoOrderIds = demoOrders.map(o => o.id);

  if (demoOrderIds.length > 0) {
    // Delete order children
    const demoOrderItems = await prisma.orderItem.findMany({
      where: { orderId: { in: demoOrderIds } },
      select: { id: true },
    });
    const demoItemIds = demoOrderItems.map(i => i.id);

    if (demoItemIds.length > 0) {
      await prisma.requiredMaterial.deleteMany({ where: { orderItemId: { in: demoItemIds } } });
    }
    await prisma.orderItem.deleteMany({ where: { orderId: { in: demoOrderIds } } });
    await prisma.materialUsage.deleteMany({ where: { orderId: { in: demoOrderIds } } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: demoOrderIds } } });
    await prisma.shipment.deleteMany({ where: { orderId: { in: demoOrderIds } } });
  }

  // Find demo POs to delete their children
  const demoPOs = await prisma.purchaseOrder.findMany({
    where: { organizationId: org.id, poNumber: { startsWith: DEMO_PO_PREFIX } },
    select: { id: true },
  });
  const demoPOIds = demoPOs.map(p => p.id);

  if (demoPOIds.length > 0) {
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: { in: demoPOIds } } });
    await prisma.pOReceiving.deleteMany({ where: { purchaseOrderId: { in: demoPOIds } } });
  }

  // Find demo inventory to delete stock movements
  const demoInv = await prisma.inventoryItem.findMany({
    where: { organizationId: org.id, sku: { startsWith: DEMO_SKU_PREFIX } },
    select: { id: true },
  });
  const demoInvIds = demoInv.map(i => i.id);

  if (demoInvIds.length > 0) {
    await prisma.stockMovement.deleteMany({ where: { inventoryItemId: { in: demoInvIds } } });
  }

  // Delete parent records
  await prisma.order.deleteMany({ where: { id: { in: demoOrderIds } } });
  await prisma.purchaseOrder.deleteMany({ where: { id: { in: demoPOIds } } });
  await prisma.inventoryItem.deleteMany({ where: { id: { in: demoInvIds } } });
  await prisma.customer.deleteMany({
    where: { organizationId: org.id, email: { startsWith: DEMO_EMAIL_PREFIX } },
  });
  await prisma.vendor.deleteMany({
    where: { organizationId: org.id, notes: { contains: DEMO_TAG } },
  });

  // Find and delete demo products (by DEMO-PROD- SKU prefix)
  const demoProducts = await prisma.product.findMany({
    where: { organizationId: org.id, sku: { startsWith: DEMO_PRODUCT_SKU_PREFIX } },
    select: { id: true },
  });
  const demoProductIds = demoProducts.map(p => p.id);
  if (demoProductIds.length > 0) {
    await prisma.productMaterialTemplate.deleteMany({ where: { productId: { in: demoProductIds } } });
    await prisma.productAddOn.deleteMany({ where: { productId: { in: demoProductIds } } });
    await prisma.product.deleteMany({ where: { id: { in: demoProductIds } } });
  }

  console.log('  Previous demo data removed.\n');

  // ─── Vendors ────────────────────────────────────────────────────────────────

  const vendors = await Promise.all(
    VENDOR_DATA.map(v =>
      prisma.vendor.create({ data: { ...v, organizationId: org.id } })
    )
  );
  console.log(`  Vendors: ${vendors.length} created`);

  // ─── Customers ──────────────────────────────────────────────────────────────

  const customers = await Promise.all(
    CUSTOMER_DATA.map(c =>
      prisma.customer.create({ data: { ...c, organizationId: org.id } })
    )
  );
  console.log(`  Customers: ${customers.length} created`);

  // ─── Inventory ──────────────────────────────────────────────────────────────

  const inventoryItems = await Promise.all(
    INVENTORY_DATA.map(i =>
      prisma.inventoryItem.create({
        data: {
          sku: i.sku,
          name: i.name,
          category: i.category as never,
          brand: i.brand,
          size: i.size,
          color: i.color,
          quantityOnHand: i.qoh,
          reorderPoint: i.rp,
          reorderQuantity: i.rq,
          costPrice: i.cost,
          organizationId: org.id,
        },
      })
    )
  );
  const invBySku = Object.fromEntries(inventoryItems.map(i => [i.sku, i]));
  console.log(`  Inventory: ${inventoryItems.length} items created`);

  // ─── Product Categories ──────────────────────────────────────────────────────

  const categories = await Promise.all(
    CATEGORY_SPECS.map(c =>
      prisma.productCategory.upsert({
        where: { organizationId_name: { organizationId: org.id, name: c.name } },
        update: { description: c.description, displayOrder: c.displayOrder },
        create: { ...c, organizationId: org.id },
      })
    )
  );
  const catByName = Object.fromEntries(categories.map(c => [c.name, c]));
  console.log(`  Product categories: ${categories.length} upserted`);

  // ─── Products ───────────────────────────────────────────────────────────────

  let productsCreated = 0;
  let templatesCreated = 0;

  for (const spec of PRODUCT_SPECS) {
    const category = catByName[spec.categoryName];
    if (!category) {
      console.warn(`  WARN: category "${spec.categoryName}" not found — skipping ${spec.sku}`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        sku: spec.sku,
        name: spec.name,
        description: spec.description,
        categoryId: category.id,
        organizationId: org.id,
        garmentType: spec.garmentType as never,
        printMethod: spec.printMethod as never,
        includedPrintLocations: spec.includedPrintLocations,
        maxPrintLocations: spec.maxPrintLocations,
        basePrice: spec.basePrice,
        priceTiers: spec.priceTiers,
        sizeUpcharges: spec.sizeUpcharges,
        availableBrands: spec.availableBrands,
        availableSizes: spec.availableSizes,
        availableColors: spec.availableColors,
        estimatedProductionMinutes: spec.estimatedProductionMinutes,
        difficultyLevel: spec.difficultyLevel,
        isFeatured: spec.isFeatured,
        isActive: true,
      },
    });

    productsCreated++;

    for (const tmpl of spec.materialTemplates) {
      const invItem = tmpl.inventorySku ? invBySku[tmpl.inventorySku] : undefined;
      await prisma.productMaterialTemplate.create({
        data: {
          productId: product.id,
          organizationId: org.id,
          materialCategory: tmpl.materialCategory,
          description: tmpl.description,
          quantityPerUnit: tmpl.quantityPerUnit,
          estimatedCostPerUnit: tmpl.estimatedCostPerUnit,
          inventoryItemId: invItem?.id ?? undefined,
        },
      });
      templatesCreated++;
    }
  }

  console.log(`  Products: ${productsCreated} created (${templatesCreated} material templates)`);

  // ─── Orders + Items ─────────────────────────────────────────────────────────

  const orderMap = new Map<string, string>(); // orderNumber -> id

  for (const spec of ORDER_SPECS) {
    const customer = customers[spec.customerIdx];
    const subtotal = spec.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const taxRate = Number(org.taxRate) || 0.0825;
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;

    const order = await prisma.order.create({
      data: {
        orderNumber: spec.orderNumber,
        customerId: customer.id,
        organizationId: org.id,
        status: spec.status as never,
        priority: spec.priority as never,
        dueDate: daysFromNow(spec.dueDaysFromNow),
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        notes: spec.notes,
      },
    });

    orderMap.set(spec.orderNumber, order.id);

    for (const item of spec.items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productType: item.productType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          printMethod: (item.printMethod ?? undefined) as never,
          printLocations: (item.printLocations ?? []) as PrintLocation[],
          description: item.description,
          organizationId: org.id,
        },
      });
    }
  }

  console.log(`  Orders: ${ORDER_SPECS.length} created (with items)`);

  // ─── Stock Movements ────────────────────────────────────────────────────────

  // Simulate PO receipts and production usage for realistic inventory history
  const stockMoves: { sku: string; type: StockMovementType; qty: number; reason: string; orderNumber?: string }[] = [
    // PO receipt for Oakwood hoodies (order 002 materials received)
    { sku: 'DEMO-GILD5000-BLK-M', type: StockMovementType.IN, qty: 100, reason: 'Received via DEMO-PO-001' },
    // Usage for Riverbend rush order (order 001 in production)
    { sku: 'DEMO-GILD5000-BLK-M', type: StockMovementType.OUT, qty: -50, reason: 'Used for DEMO-ORD-001', orderNumber: `${DEMO_ORDER_PREFIX}001` },
    // Usage for Coastal Catering event tees (order 011 in production)
    { sku: 'DEMO-GILD5000-WHT-M', type: StockMovementType.OUT, qty: -18, reason: 'Used for DEMO-ORD-011', orderNumber: `${DEMO_ORDER_PREFIX}011` },
    { sku: 'DEMO-SISR-EW-BLK', type: StockMovementType.OUT, qty: -1, reason: 'Used for DEMO-ORD-011', orderNumber: `${DEMO_ORDER_PREFIX}011` },
    // DTF gang sheets used for school tees (order 005 shipped)
    { sku: 'DEMO-DTF-GANG-22x60', type: StockMovementType.IN, qty: 20, reason: 'Received via DEMO-PO-003' },
    { sku: 'DEMO-DTF-GANG-22x60', type: StockMovementType.OUT, qty: -20, reason: 'Used for DEMO-ORD-005', orderNumber: `${DEMO_ORDER_PREFIX}005` },
    // Recent receipt for poly mailers
    { sku: 'DEMO-POLY-14x19', type: StockMovementType.IN, qty: 200, reason: 'Restock order received' },
    { sku: 'DEMO-POLY-14x19', type: StockMovementType.OUT, qty: -162, reason: 'Packaging for multiple shipments' },
  ];

  for (const m of stockMoves) {
    const invItem = invBySku[m.sku];
    if (!invItem) continue;
    const orderId = m.orderNumber ? orderMap.get(m.orderNumber) : undefined;
    await prisma.stockMovement.create({
      data: {
        inventoryItemId: invItem.id,
        type: m.type,
        quantity: m.qty,
        reason: m.reason,
        orderId: orderId ?? undefined,
        organizationId: org.id,
      },
    });
  }

  console.log(`  Stock movements: ${stockMoves.length} created`);

  // ─── Purchase Orders ────────────────────────────────────────────────────────

  for (const spec of PO_SPECS) {
    const vendor = vendors[spec.vendorIdx];
    const linkedOrderId = orderMap.get(spec.orderNumber);
    const total = spec.items.reduce((s, i) => s + i.qty * i.cost, 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: spec.poNumber,
        vendorId: vendor.id,
        organizationId: org.id,
        status: spec.status as never,
        linkedOrderId: linkedOrderId ?? undefined,
        total,
      },
    });

    for (const item of spec.items) {
      await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          description: item.description,
          quantity: item.qty,
          unitCost: item.cost,
          lineTotal: item.qty * item.cost,
          organizationId: org.id,
        },
      });
    }
  }

  console.log(`  Purchase orders: ${PO_SPECS.length} created`);

  // ─── Shipments ──────────────────────────────────────────────────────────────

  for (const spec of SHIPMENT_SPECS) {
    const orderId = orderMap.get(spec.orderNumber);
    if (!orderId) continue;
    await prisma.shipment.create({
      data: {
        orderId,
        organizationId: org.id,
        trackingNumber: spec.tracking,
        carrier: spec.carrier,
        status: spec.status as never,
      },
    });
  }

  console.log(`  Shipments: ${SHIPMENT_SPECS.length} created`);

  // ─── Summary ────────────────────────────────────────────────────────────────

  // Count low-stock items for dashboard visibility
  const lowStockCount = INVENTORY_DATA.filter(i => i.qoh <= i.rp).length;

  console.log('\n--- Marketing demo data seeded successfully ---');
  console.log(`  Org:        ${org.name} (${org.slug})`);
  console.log(`  Vendors:    ${vendors.length}`);
  console.log(`  Customers:  ${customers.length}`);
  console.log(`  Inventory:  ${inventoryItems.length} items (${lowStockCount} low-stock)`);
  console.log(`  Categories: ${categories.length} | Products: ${productsCreated} (${PRODUCT_SPECS.filter(p => p.isFeatured).length} featured)`);
  console.log(`  Orders:     ${ORDER_SPECS.length} across ${new Set(ORDER_SPECS.map(o => o.status)).size} statuses`);
  console.log(`  POs:        ${PO_SPECS.length}`);
  console.log(`  Shipments:  ${SHIPMENT_SPECS.length}`);
  console.log('\nAll records are tagged with [MARKETING DEMO], DEMO- prefixes, or demo+ emails.');
  console.log('Re-run this script to refresh the data. Only demo-tagged records will be replaced.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
