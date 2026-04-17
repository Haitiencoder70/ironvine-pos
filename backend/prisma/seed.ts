import { PrismaClient, StockMovementType, PrintLocation, ShipmentCarrier } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database with realistic catalog data...');

  // ─── Organization ───────────────────────────────────────────────────────────

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-tshirt-co' },
    update: {},
    create: {
      clerkOrgId: 'org_demo_placeholder',
      slug: 'demo-tshirt-co',
      name: 'Demo T-Shirt Co',
      subdomain: 'demo',
      plan: 'PRO',
      orderNumberPrefix: 'ORD',
      currency: 'USD',
      timezone: 'America/Chicago',
      taxRate: 0.0825,
    },
  });

  console.log(`✓ Organization: ${org.name} (${org.id})`);

  // ─── Vendors ──────────────────────────────────────────────────────────────────

  const vendorData = [
    {
      name: 'S&S Activewear',
      contactName: 'Sales Dept',
      email: 'dispatch@ssactivewear.com',
      phone: '(800) 523-2155',
      categories: ['BLANK_SHIRTS'],
      paymentTerms: 'Net 30',
      leadTimeDays: 5,
      notes: 'Primary blank garment supplier. Stocks Gildan, Bella+Canvas, Next Level, Comfort Colors, Hanes.',
    },
    {
      name: 'DTF Transfers Pro',
      contactName: 'Ordering Team',
      email: 'orders@dtftransferspro.com',
      phone: '(305) 555-0190',
      categories: ['DTF_TRANSFERS'],
      paymentTerms: 'Net 15',
      leadTimeDays: 3,
      notes: 'Gang sheets and single transfers. Rush available for +30%. Hot/cold/warm peel options.',
    },
    {
      name: 'Siser North America',
      contactName: 'Sales Support',
      email: 'sales@siserna.com',
      phone: '(972) 555-0234',
      categories: ['VINYL'],
      paymentTerms: 'Net 30',
      leadTimeDays: 7,
      notes: 'Full Siser product line: EasyWeed, Glitter, Holographic, Electric, StripFlock.',
    },
  ];

  const vendors = await Promise.all(
    vendorData.map(v => prisma.vendor.upsert({
      where: { name_organizationId: { name: v.name, organizationId: org.id } },
      update: {},
      create: { ...v, organizationId: org.id },
    }))
  );

  console.log(`✓ Vendors: ${vendors.length} created`);

  // ─── Customers ────────────────────────────────────────────────────────────────

  const customerData = [
    { firstName: 'Marcus',    lastName: 'Johnson',  email: 'marcus@mjsports.com',      phone: '214-555-0101', company: 'MJ Sports League',           shippingStreet: '123 Game Day Ln',    shippingCity: 'Dallas',     shippingState: 'TX', shippingZip: '75201' },
    { firstName: 'Sarah',     lastName: 'Williams', email: 'sarah.w@gmail.com',         phone: '214-555-0102', company: 'Family Reunion 2024',        shippingStreet: '456 Reunion Way',    shippingCity: 'Plano',      shippingState: 'TX', shippingZip: '75023' },
    { firstName: 'Oscar',     lastName: 'Rodriguez',email: 'oscar@rodriguezcon.com',    phone: '214-555-0103', company: 'Rodriguez Construction LLC', shippingStreet: '789 Hammer St',      shippingCity: 'Fort Worth', shippingState: 'TX', shippingZip: '76102' },
    { firstName: 'Pastor',    lastName: 'James',    email: 'office@fbc-dallas.org',     phone: '214-555-0104', company: 'First Baptist Church Dallas', shippingStreet: '101 Church Rd',      shippingCity: 'Dallas',     shippingState: 'TX', shippingZip: '75201' },
    { firstName: 'Lisa',      lastName: 'Chen',     email: 'lisa@chensbakery.com',      phone: '214-555-0105', company: "Chen's Bakery",              shippingStreet: '202 Pastry Ln',      shippingCity: 'Dallas',     shippingState: 'TX', shippingZip: '75204' },
    { firstName: 'Coach',     lastName: 'Iron',     email: 'admin@ironworks.com',       phone: '214-555-0106', company: 'CrossFit Iron Works',        shippingStreet: '303 Power Blvd',     shippingCity: 'Dallas',     shippingState: 'TX', shippingZip: '75212' },
    { firstName: 'Principal', lastName: 'Miller',   email: 'pmiller@lhs.edu',           phone: '214-555-0107', company: 'Lincoln High School',        shippingStreet: '404 School Ave',     shippingCity: 'Dallas',     shippingState: 'TX', shippingZip: '75201' },
    { firstName: 'Maria',     lastName: 'Garcia',   email: 'maria.g@gmail.com',         phone: '214-555-0108', company: "Maria's Quinceañera",        shippingStreet: '505 Party Cir',      shippingCity: 'Dallas',     shippingState: 'TX', shippingZip: '75202' },
  ];

  const customers = await Promise.all(
    customerData.map(c => prisma.customer.upsert({
      where: { email_organizationId: { email: c.email, organizationId: org.id } },
      update: {},
      create: { ...c, organizationId: org.id },
    }))
  );

  console.log(`✓ Customers: ${customers.length} created`);

  // ─── Inventory Items ──────────────────────────────────────────────────────────

  type InvItem = {
    sku: string; name: string; category: string;
    brand?: string; size?: string; color?: string;
    qoh: number; rp: number; rq: number; cost: number;
    attributes?: Record<string, unknown>;
  };

  const invItemsData: InvItem[] = [
    // ── Blank Garments ──
    { sku: 'GILD-5000-BLK-M',      name: 'Gildan 5000 Heavy Cotton T-Shirt - Black - M',             category: 'BLANK_SHIRTS',  brand: 'Gildan',        size: 'M',          color: 'Black',         qoh: 45, rp: 20, rq: 100, cost: 3.50,  attributes: { styleNumber: '5000', fabric: '100% Cotton', weight: '5.3oz', fit: 'Classic' } },
    { sku: 'GILD-5000-WHT-M',      name: 'Gildan 5000 Heavy Cotton T-Shirt - White - M',             category: 'BLANK_SHIRTS',  brand: 'Gildan',        size: 'M',          color: 'White',         qoh: 38, rp: 20, rq: 100, cost: 3.50,  attributes: { styleNumber: '5000', fabric: '100% Cotton', weight: '5.3oz', fit: 'Classic' } },
    { sku: 'GILD-5000-NVY-M',      name: 'Gildan 5000 Heavy Cotton T-Shirt - Navy - M',              category: 'BLANK_SHIRTS',  brand: 'Gildan',        size: 'M',          color: 'Navy',          qoh: 12, rp: 20, rq: 100, cost: 3.50,  attributes: { styleNumber: '5000', fabric: '100% Cotton', weight: '5.3oz', fit: 'Classic' } },
    { sku: 'GILD-2000-SORA-XL',    name: 'Gildan 2000 Ultra Cotton T-Shirt - Safety Orange - XL',   category: 'BLANK_SHIRTS',  brand: 'Gildan',        size: 'XL',         color: 'Safety Orange', qoh: 0,  rp: 20, rq: 100, cost: 3.75,  attributes: { styleNumber: '2000', fabric: '100% Cotton', weight: '6.0oz', fit: 'Classic' } },
    { sku: 'GILD-2000-SORA-L',     name: 'Gildan 2000 Ultra Cotton T-Shirt - Safety Orange - L',    category: 'BLANK_SHIRTS',  brand: 'Gildan',        size: 'L',          color: 'Safety Orange', qoh: 0,  rp: 20, rq: 100, cost: 3.75,  attributes: { styleNumber: '2000', fabric: '100% Cotton', weight: '6.0oz', fit: 'Classic' } },
    { sku: 'BC-3001-BLK-M',        name: 'Bella+Canvas 3001 Unisex Jersey T-Shirt - Black - M',     category: 'BLANK_SHIRTS',  brand: 'Bella+Canvas',  size: 'M',          color: 'Black',         qoh: 8,  rp: 20, rq: 100, cost: 4.25,  attributes: { styleNumber: '3001', fabric: '100% Airlume Combed Ring-Spun Cotton', weight: '4.2oz', fit: 'Retail' } },
    { sku: 'NL-3600-BLK-M',        name: 'Next Level 3600 Unisex Cotton T-Shirt - Black - M',       category: 'BLANK_SHIRTS',  brand: 'Next Level',    size: 'M',          color: 'Black',         qoh: 5,  rp: 20, rq: 100, cost: 3.75,  attributes: { styleNumber: '3600', fabric: '100% Combed Ring-Spun Cotton', weight: '4.3oz', fit: 'Modern' } },
    // ── DTF Transfers ──
    { sku: 'DTF-GANG-22x60-MISC',  name: 'DTF Gang Sheet 22"x60" - Hot Peel - Matte (Misc)',        category: 'DTF_TRANSFERS', qoh: 3,  rp: 5,  rq: 20, cost: 30.00, attributes: { transferType: 'gang-sheet', filmType: 'Hot Peel', finish: 'Matte', sheetWidth: 22, sheetHeight: 60 } },
    { sku: 'DTF-SNG-12x14-MISC',   name: 'DTF Single Transfer 12"x14" - Hot Peel - Matte (Misc)',   category: 'DTF_TRANSFERS', qoh: 8,  rp: 10, rq: 50, cost: 6.00,  attributes: { transferType: 'single', filmType: 'Hot Peel', finish: 'Matte', sheetWidth: 12, sheetHeight: 14 } },
    // ── HTV Vinyl ──
    { sku: 'SISR-EW-BLK-12x5YD',  name: 'Siser EasyWeed HTV - Black - 12" x 5yd Roll',             category: 'VINYL',         brand: 'Siser',         size: '12" x 5yd Roll', color: 'Black',      qoh: 3,  rp: 2,  rq: 5,  cost: 22.00, attributes: { productLine: 'EasyWeed', vinylType: 'Standard', pressTemp: '305°F / 150°C', pressTime: '10-15 seconds' } },
    { sku: 'SISR-EW-WHT-12x5YD',  name: 'Siser EasyWeed HTV - White - 12" x 5yd Roll',             category: 'VINYL',         brand: 'Siser',         size: '12" x 5yd Roll', color: 'White',      qoh: 2,  rp: 2,  rq: 5,  cost: 22.00, attributes: { productLine: 'EasyWeed', vinylType: 'Standard', pressTemp: '305°F / 150°C', pressTime: '10-15 seconds' } },
    { sku: 'SISR-EW-SORA-15x5YD', name: 'Siser EasyWeed HTV - Safety Orange - 15" x 5yd Roll',     category: 'VINYL',         brand: 'Siser',         size: '15" x 5yd Roll', color: 'Safety Orange', qoh: 0, rp: 2, rq: 5, cost: 28.00, attributes: { productLine: 'EasyWeed', vinylType: 'Standard', pressTemp: '305°F / 150°C', pressTime: '10-15 seconds' } },
    { sku: 'SISR-EW-RED-12x5YD',  name: 'Siser EasyWeed HTV - Red - 12" x 5yd Roll',               category: 'VINYL',         brand: 'Siser',         size: '12" x 5yd Roll', color: 'Red',        qoh: 4,  rp: 2,  rq: 5,  cost: 22.00, attributes: { productLine: 'EasyWeed', vinylType: 'Standard', pressTemp: '305°F / 150°C', pressTime: '10-15 seconds' } },
    { sku: 'SISR-GLT-GLD-12x12',  name: 'Siser Glitter HTV - Gold - 12" x 12" Sheet',              category: 'VINYL',         brand: 'Siser',         size: '12" x 12" Sheet', color: 'Gold',      qoh: 6,  rp: 5,  rq: 10, cost: 4.00,  attributes: { productLine: 'Glitter', vinylType: 'Glitter', pressTemp: '320°F / 160°C', pressTime: '15-20 seconds' } },
    { sku: 'SISR-GLT-RGOLD-12x12',name: 'Siser Glitter HTV - Rose Gold - 12" x 12" Sheet',         category: 'VINYL',         brand: 'Siser',         size: '12" x 12" Sheet', color: 'Rose Gold', qoh: 2,  rp: 5,  rq: 10, cost: 4.00,  attributes: { productLine: 'Glitter', vinylType: 'Glitter', pressTemp: '320°F / 160°C', pressTime: '15-20 seconds' } },
    // ── Supplies ──
    { sku: 'SUP-PARCH-16x20-100', name: 'Parchment Paper 16"x20" - Pack of 100 sheets',             category: 'PACKAGING',     size: '16"x20"',        qoh: 200, rp: 50, rq: 100, cost: 0.12, attributes: { supplyCategory: 'Heat Press Supplies', unit: 'pack of 100' } },
    { sku: 'SUP-TEFL-16x20',      name: 'Teflon/PTFE Sheet 16"x20" - Reusable',                     category: 'PACKAGING',     size: '16"x20"',        qoh: 3,   rp: 1,  rq: 5,   cost: 10.00, attributes: { supplyCategory: 'Heat Press Supplies', unit: 'each' } },
    { sku: 'SUP-POLY-14x19-100',  name: 'Poly Mailers 14.5"x19" - Pack of 100',                     category: 'PACKAGING',     size: '14.5"x19"',      qoh: 45,  rp: 100,rq: 200, cost: 0.14, attributes: { supplyCategory: 'Packaging & Shipping', unit: 'pack of 100' } },
    { sku: 'SUP-STK-2RND-500',    name: 'Thank You Stickers 2" Round - Roll of 500',                 category: 'PACKAGING',     size: '2" Round',       qoh: 350, rp: 100,rq: 500, cost: 0.02, attributes: { supplyCategory: 'Packaging & Shipping', unit: 'roll of 500' } },
  ];

  const inventoryItems = await Promise.all(
    invItemsData.map(i => prisma.inventoryItem.upsert({
      where: { sku_organizationId: { sku: i.sku, organizationId: org.id } },
      update: {},
      create: {
        sku: i.sku,
        name: i.name,
        category: i.category as any,
        brand: i.brand ?? undefined,
        size: i.size ?? undefined,
        color: i.color ?? undefined,
        quantityOnHand: i.qoh,
        reorderPoint: i.rp,
        reorderQuantity: i.rq,
        costPrice: i.cost,
        attributes: (i.attributes ?? {}) as any,
        organizationId: org.id,
      },
    }))
  );

  // Build lookup by SKU for later references
  const invBySku = Object.fromEntries(inventoryItems.map(i => [i.sku, i]));

  console.log(`✓ Inventory: ${inventoryItems.length} items created`);

  // ─── Orders ──────────────────────────────────────────────────────────────────

  type OrderItemSpec = {
    productType: string;
    description: string;
    quantity: number;
    unitPrice: number;
    printMethod?: string;
    printLocations?: string[];
  };

  type MaterialSpec = {
    category: string;
    description: string;
    quantity: number;
    unitPrice: number;
    inventorySku?: string;
  };

  type OrderSpec = {
    customerIdx: number;
    status: string;
    priority: string;
    dueDate: string;
    items: OrderItemSpec[];
    materials: MaterialSpec[][];  // parallel array — one sub-array of materials per item
  };

  const orderSpecs: OrderSpec[] = [
    // ── Order 1: MJ Sports League — COMPLETED, DTF ──
    {
      customerIdx: 0, status: 'COMPLETED', priority: 'NORMAL', dueDate: '2024-03-15',
      items: [
        {
          productType: 'TSHIRT',
          description: '50x Gildan 5000 Heavy Cotton T-Shirt - Navy Blue - Mixed Sizes (5S, 15M, 15L, 10XL, 5-2XL) - 5.3oz 100% Cotton | DTF Front (League Logo 12"x14") + Back (Player Names 10"x12")',
          quantity: 50, unitPrice: 18.00, printMethod: 'DTF', printLocations: ['FRONT', 'BACK'],
        },
      ],
      materials: [[
        { category: 'BLANK_GARMENT',  description: '50x Gildan 5000 Heavy Cotton T-Shirt - Navy Blue - Mixed Sizes', quantity: 50, unitPrice: 3.50 },
        { category: 'DTF_TRANSFER',   description: '5x DTF Gang Sheet 22"x60" - Hot Peel - Matte - White Ink Base - League Logo Front - 10 designs/sheet (50 total)', quantity: 5, unitPrice: 30.00, inventorySku: 'DTF-GANG-22x60-MISC' },
        { category: 'DTF_TRANSFER',   description: '5x DTF Gang Sheet 22"x60" - Hot Peel - Matte - White Ink Base - Player Names Back - 10 designs/sheet (50 total)', quantity: 5, unitPrice: 30.00, inventorySku: 'DTF-GANG-22x60-MISC' },
      ]],
    },
    // ── Order 2: Rodriguez Construction — IN_PRODUCTION, HTV ──
    {
      customerIdx: 2, status: 'IN_PRODUCTION', priority: 'HIGH', dueDate: '2024-04-20',
      items: [
        {
          productType: 'TSHIRT',
          description: '50x Gildan 2000 Ultra Cotton T-Shirt - Safety Orange - Size XL - 6.0oz 100% Cotton | HTV Front Left Chest (Company Logo 4"x4") + Full Back (RODRIGUEZ CONSTRUCTION 12"x14")',
          quantity: 50, unitPrice: 22.00, printMethod: 'HTV', printLocations: ['FRONT', 'BACK'],
        },
        {
          productType: 'TSHIRT',
          description: '50x Gildan 2000 Ultra Cotton T-Shirt - Safety Orange - Size L - 6.0oz 100% Cotton | HTV Front Left Chest (Company Logo 4"x4") + Full Back (RODRIGUEZ CONSTRUCTION 12"x14")',
          quantity: 50, unitPrice: 22.00, printMethod: 'HTV', printLocations: ['FRONT', 'BACK'],
        },
      ],
      materials: [
        [
          { category: 'BLANK_GARMENT', description: '50x Gildan 2000 Ultra Cotton T-Shirt - Safety Orange - XL', quantity: 50, unitPrice: 3.75, inventorySku: 'GILD-2000-SORA-XL' },
          { category: 'HTV_VINYL',     description: '2x Siser EasyWeed HTV - Safety Orange - 15" x 5yd Roll', quantity: 2, unitPrice: 28.00, inventorySku: 'SISR-EW-SORA-15x5YD' },
          { category: 'HTV_VINYL',     description: '1x Siser EasyWeed HTV - Black - 12" x 5yd Roll (lettering)', quantity: 1, unitPrice: 22.00, inventorySku: 'SISR-EW-BLK-12x5YD' },
        ],
        [
          { category: 'BLANK_GARMENT', description: '50x Gildan 2000 Ultra Cotton T-Shirt - Safety Orange - L', quantity: 50, unitPrice: 3.75, inventorySku: 'GILD-2000-SORA-L' },
        ],
      ],
    },
    // ── Order 3: First Baptist Church — MATERIALS_ORDERED, DTF ──
    {
      customerIdx: 3, status: 'MATERIALS_ORDERED', priority: 'NORMAL', dueDate: '2024-05-01',
      items: [
        {
          productType: 'TSHIRT',
          description: '100x Bella+Canvas 3001 Unisex Jersey T-Shirt - Athletic Heather - Mixed Sizes (10XS, 15S, 25M, 25L, 15XL, 10-2XL) - 4.2oz Airlume Combed Ring-Spun Cotton | DTF Front (VBS 2024 Logo 10"x12")',
          quantity: 100, unitPrice: 15.00, printMethod: 'DTF', printLocations: ['FRONT'],
        },
      ],
      materials: [[
        { category: 'BLANK_GARMENT', description: '100x Bella+Canvas 3001 - Athletic Heather - Mixed Sizes (10XS, 15S, 25M, 25L, 15XL, 10-2XL)', quantity: 100, unitPrice: 4.25 },
        { category: 'DTF_TRANSFER',  description: '10x DTF Gang Sheet 22"x60" - Hot Peel - Matte - White Ink Base - VBS 2024 Logo - 10 designs/sheet (100 total)', quantity: 10, unitPrice: 30.00 },
      ]],
    },
    // ── Order 4: Chen's Bakery — QUOTE, DTF ──
    {
      customerIdx: 4, status: 'QUOTE', priority: 'NORMAL', dueDate: '2024-05-10',
      items: [
        {
          productType: 'TSHIRT',
          description: '10x Next Level 3600 Unisex Cotton T-Shirt - Black - Mixed Sizes (2S, 3M, 3L, 2XL) - 4.3oz Combed Ring-Spun Cotton | DTF Front Left Chest (Bakery Logo 4"x4")',
          quantity: 10, unitPrice: 25.00, printMethod: 'DTF', printLocations: ['FRONT'],
        },
        {
          productType: 'TSHIRT',
          description: '10x Next Level 3600 Unisex Cotton T-Shirt - White - Mixed Sizes (2S, 3M, 3L, 2XL) - 4.3oz Combed Ring-Spun Cotton | DTF Front Left Chest (Bakery Logo 4"x4")',
          quantity: 10, unitPrice: 25.00, printMethod: 'DTF', printLocations: ['FRONT'],
        },
      ],
      materials: [[], []],
    },
    // ── Order 5: Sarah Williams Family Reunion — READY_TO_SHIP, DTF ──
    {
      customerIdx: 1, status: 'READY_TO_SHIP', priority: 'NORMAL', dueDate: '2024-04-05',
      items: [
        {
          productType: 'TSHIRT',
          description: '35x Comfort Colors 1717 Garment-Dyed Heavyweight T-Shirt - Butter - Mixed Sizes (3S, 8M, 10L, 8XL, 4-2XL, 2-3XL) - 6.1oz Ring-Spun Cotton | DTF Front (Family Tree Design 10"x12") + Back (Names & Date 10"x14")',
          quantity: 35, unitPrice: 20.00, printMethod: 'DTF', printLocations: ['FRONT', 'BACK'],
        },
      ],
      materials: [[
        { category: 'BLANK_GARMENT', description: '35x Comfort Colors 1717 Garment-Dyed T-Shirt - Butter - Mixed Sizes', quantity: 35, unitPrice: 5.75 },
        { category: 'DTF_TRANSFER',  description: '4x DTF Gang Sheet 22"x60" - Hot Peel - Matte - White Ink Base - Family Tree Front - 9 designs/sheet', quantity: 4, unitPrice: 30.00 },
        { category: 'DTF_TRANSFER',  description: '3x DTF Gang Sheet 22"x60" - Hot Peel - Matte - White Ink Base - Names & Date Back - 12 designs/sheet', quantity: 3, unitPrice: 30.00 },
      ]],
    },
    // ── Order 6: CrossFit Iron Works — APPROVED, HTV ──
    {
      customerIdx: 5, status: 'APPROVED', priority: 'HIGH', dueDate: '2024-04-15',
      items: [
        {
          productType: 'TSHIRT',
          description: '30x Bella+Canvas 3001 Unisex Jersey T-Shirt - Black - Mixed Sizes - 4.2oz Airlume Cotton | HTV Front (Gym Logo 8"x8" - White EasyWeed)',
          quantity: 30, unitPrice: 25.00, printMethod: 'HTV', printLocations: ['FRONT'],
        },
        {
          productType: 'HOODIE',
          description: '15x Bella+Canvas 3719 Unisex Sponge Fleece Hoodie - Black - Mixed Sizes - 7.0oz | HTV Front (Gym Logo 8"x8" - White EasyWeed)',
          quantity: 15, unitPrice: 45.00, printMethod: 'HTV', printLocations: ['FRONT'],
        },
      ],
      materials: [
        [
          { category: 'BLANK_GARMENT', description: '30x Bella+Canvas 3001 - Black - Mixed Sizes', quantity: 30, unitPrice: 4.25 },
          { category: 'HTV_VINYL',     description: '1x Siser EasyWeed HTV - White - 12" x 5yd Roll (gym logo lettering)', quantity: 1, unitPrice: 22.00, inventorySku: 'SISR-EW-WHT-12x5YD' },
        ],
        [
          { category: 'BLANK_GARMENT', description: '15x Bella+Canvas 3719 Hoodie - Black - Mixed Sizes', quantity: 15, unitPrice: 16.00 },
        ],
      ],
    },
    // ── Order 7: Lincoln High School — SHIPPED, DTF ──
    {
      customerIdx: 6, status: 'SHIPPED', priority: 'NORMAL', dueDate: '2024-03-20',
      items: [
        {
          productType: 'TSHIRT',
          description: '200x Gildan 5000 Heavy Cotton T-Shirt - Cardinal Red - Mixed Sizes (20S, 50M, 60L, 40XL, 20-2XL, 10-3XL) - 5.3oz 100% Cotton | DTF Front (School Mascot 10"x12") + Back (Lincoln Lions 12"x14")',
          quantity: 200, unitPrice: 15.00, printMethod: 'DTF', printLocations: ['FRONT', 'BACK'],
        },
      ],
      materials: [[
        { category: 'BLANK_GARMENT', description: '200x Gildan 5000 Heavy Cotton T-Shirt - Cardinal Red - Mixed Sizes', quantity: 200, unitPrice: 3.50 },
        { category: 'DTF_TRANSFER',  description: '20x DTF Gang Sheet 22"x60" - Hot Peel - Matte - White Ink Base - School Mascot Front - 10 designs/sheet', quantity: 20, unitPrice: 30.00 },
        { category: 'DTF_TRANSFER',  description: '17x DTF Gang Sheet 22"x60" - Hot Peel - Matte - White Ink Base - Lincoln Lions Back - 12 designs/sheet', quantity: 17, unitPrice: 30.00 },
      ]],
    },
    // ── Order 8: Maria's Quinceañera — PENDING_APPROVAL, DTF ──
    {
      customerIdx: 7, status: 'PENDING_APPROVAL', priority: 'NORMAL', dueDate: '2024-04-25',
      items: [
        {
          productType: 'TSHIRT',
          description: '25x Bella+Canvas 3001 Unisex Jersey T-Shirt - Soft Pink - Mixed Sizes (3S, 7M, 8L, 5XL, 2-2XL) - 4.2oz | DTF Front (Quinceañera Design 10"x12" - Soft Pink White Ink Base)',
          quantity: 25, unitPrice: 20.00, printMethod: 'DTF', printLocations: ['FRONT'],
        },
      ],
      materials: [[
        { category: 'BLANK_GARMENT', description: '25x Bella+Canvas 3001 - Soft Pink - Mixed Sizes', quantity: 25, unitPrice: 4.25 },
        { category: 'DTF_TRANSFER',  description: '3x DTF Gang Sheet 22"x60" - Warm Peel - Matte - White Ink Base - Quinceañera Design - 9 designs/sheet', quantity: 3, unitPrice: 30.00 },
      ]],
    },
    // ── Order 9: MJ Sports (DELIVERED) ──
    {
      customerIdx: 0, status: 'DELIVERED', priority: 'NORMAL', dueDate: '2024-02-01',
      items: [
        {
          productType: 'TSHIRT',
          description: '10x Gildan 5000 Heavy Cotton T-Shirt - White - Size M - Sample Run | DTF Front (League Logo 4"x4" left chest)',
          quantity: 10, unitPrice: 15.00, printMethod: 'DTF', printLocations: ['FRONT'],
        },
      ],
      materials: [[
        { category: 'BLANK_GARMENT', description: '10x Gildan 5000 Heavy Cotton T-Shirt - White - M', quantity: 10, unitPrice: 3.50, inventorySku: 'GILD-5000-WHT-M' },
        { category: 'DTF_TRANSFER',  description: '2x DTF Single Transfer 4"x4" - Hot Peel - Matte - League Logo Left Chest', quantity: 2, unitPrice: 1.50 },
      ]],
    },
    // ── Order 10: Sarah Williams (ON_HOLD) ──
    {
      customerIdx: 1, status: 'ON_HOLD', priority: 'NORMAL', dueDate: '2024-04-10',
      items: [
        {
          productType: 'TSHIRT',
          description: '20x Bella+Canvas 3413 Unisex Triblend T-Shirt - Grey Triblend - Size M - Awaiting Design Approval | DTF Front (Custom Design TBD)',
          quantity: 20, unitPrice: 18.00, printMethod: 'DTF', printLocations: ['FRONT'],
        },
      ],
      materials: [[]],
    },
    // ── Order 11: Rodriguez Construction (CANCELLED) ──
    {
      customerIdx: 2, status: 'CANCELLED', priority: 'NORMAL', dueDate: '2024-03-01',
      items: [
        {
          productType: 'HOODIE',
          description: '5x Gildan 18500 Heavy Blend Hooded Sweatshirt - Navy - Size L - CANCELLED: Customer changed mind',
          quantity: 5, unitPrice: 30.00, printMethod: 'DTF', printLocations: ['FRONT'],
        },
      ],
      materials: [[]],
    },
    // ── Order 12: First Baptist (QUALITY_CHECK) ──
    {
      customerIdx: 3, status: 'QUALITY_CHECK', priority: 'HIGH', dueDate: '2024-04-12',
      items: [
        {
          productType: 'TSHIRT',
          description: '50x Bella+Canvas 3001 Unisex Jersey T-Shirt - White - Mixed Sizes (5S, 15M, 15L, 10XL, 5-2XL) | DTF Front (Easter Sunday 2024 - 10"x12" - No White Base Needed)',
          quantity: 50, unitPrice: 15.00, printMethod: 'DTF', printLocations: ['FRONT'],
        },
      ],
      materials: [[
        { category: 'BLANK_GARMENT', description: '50x Bella+Canvas 3001 - White - Mixed Sizes', quantity: 50, unitPrice: 4.25 },
        { category: 'DTF_TRANSFER',  description: '5x DTF Gang Sheet 22"x60" - Hot Peel - Glossy - No White Base - Easter Sunday 2024 - 10 designs/sheet', quantity: 5, unitPrice: 30.00 },
      ]],
    },
  ];

  const orders: { id: string; orderNumber: string }[] = [];

  for (const [idx, spec] of orderSpecs.entries()) {
    const customer = customers[spec.customerIdx];
    const subtotal = spec.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const taxAmount = subtotal * 0.0825;

    const order = await prisma.order.upsert({
      where: {
        orderNumber_organizationId: {
          orderNumber: `ORD-2024-${String(idx + 1).padStart(3, '0')}`,
          organizationId: org.id,
        },
      },
      update: {},
      create: {
        orderNumber: `ORD-2024-${String(idx + 1).padStart(3, '0')}`,
        customerId: customer.id,
        organizationId: org.id,
        status: spec.status as any,
        priority: spec.priority as any,
        dueDate: spec.dueDate ? new Date(spec.dueDate) : null,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
      },
    });

    // Create order items + required materials
    for (const [itemIdx, item] of spec.items.entries()) {
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productType: item.productType,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
          printMethod: item.printMethod as any ?? undefined,
          printLocations: (item.printLocations ?? []) as PrintLocation[],
          description: item.description,
          organizationId: org.id,
        },
      });

      // Create RequiredMaterial records for this item
      const mats = spec.materials[itemIdx] ?? [];
      for (const mat of mats) {
        const invItem = mat.inventorySku ? invBySku[mat.inventorySku] : undefined;
        await prisma.requiredMaterial.create({
          data: {
            orderItemId: orderItem.id,
            inventoryItemId: invItem?.id ?? undefined,
            description: mat.description,
            quantityRequired: mat.quantity,
            quantityUnit: 'units',
            isFulfilled: ['COMPLETED', 'DELIVERED', 'SHIPPED', 'READY_TO_SHIP', 'IN_PRODUCTION'].includes(spec.status),
            organizationId: org.id,
            attributes: { category: mat.category, unitPrice: mat.unitPrice },
          },
        });
      }
    }

    orders.push({ id: order.id, orderNumber: order.orderNumber });
  }

  console.log(`✓ Orders: ${orders.length} created (with required materials)`);

  // ─── Stock Movements ──────────────────────────────────────────────────────────
  // Record stock movements for completed/in-production orders

  const completedOrderUsages: { sku: string; qty: number; orderId: string }[] = [
    // Order 1 (COMPLETED): used Gildan 5000 Navy
    { sku: 'GILD-5000-NVY-M', qty: 50, orderId: orders[0].id },
    // Order 2 (IN_PRODUCTION): used Safety Orange shirts + vinyl
    { sku: 'GILD-2000-SORA-XL',    qty: 50, orderId: orders[1].id },
    { sku: 'GILD-2000-SORA-L',     qty: 50, orderId: orders[1].id },
    { sku: 'SISR-EW-SORA-15x5YD', qty: 2,  orderId: orders[1].id },
    { sku: 'SISR-EW-BLK-12x5YD',  qty: 1,  orderId: orders[1].id },
    // Order 5 (READY_TO_SHIP) — materials received and used
    { sku: 'DTF-GANG-22x60-MISC',  qty: 7,  orderId: orders[4].id },
    // Order 9 (DELIVERED): sample run
    { sku: 'GILD-5000-WHT-M', qty: 10, orderId: orders[8].id },
  ];

  for (const usage of completedOrderUsages) {
    const invItem = invBySku[usage.sku];
    if (!invItem) continue;
    await prisma.stockMovement.create({
      data: {
        inventoryItemId: invItem.id,
        type: StockMovementType.OUT,
        quantity: -usage.qty,
        reason: `Used for ${orders.find(o => o.id === usage.orderId)?.orderNumber ?? 'order'}`,
        orderId: usage.orderId,
        organizationId: org.id,
      },
    });
  }

  // PO receipts — stock IN movements for received POs
  const poReceipts: { sku: string; qty: number; poNumber: string }[] = [
    { sku: 'GILD-2000-SORA-XL',    qty: 50, poNumber: 'PO-2024-001' },
    { sku: 'GILD-2000-SORA-L',     qty: 50, poNumber: 'PO-2024-001' },
    { sku: 'SISR-EW-SORA-15x5YD', qty: 2,  poNumber: 'PO-2024-002' },
    { sku: 'SISR-EW-BLK-12x5YD',  qty: 1,  poNumber: 'PO-2024-002' },
  ];

  for (const receipt of poReceipts) {
    const invItem = invBySku[receipt.sku];
    if (!invItem) continue;
    await prisma.stockMovement.create({
      data: {
        inventoryItemId: invItem.id,
        type: StockMovementType.IN,
        quantity: receipt.qty,
        reason: `Received via ${receipt.poNumber}`,
        organizationId: org.id,
      },
    });
  }

  console.log(`✓ Stock movements: ${completedOrderUsages.length + poReceipts.length} created`);

  // ─── Purchase Orders ────────────────────────────────────────────────────────

  type POSpec = {
    vendorIdx: number;
    orderIdx: number;
    status: string;
    items: { description: string; qty: number; cost: number }[];
  };

  const poSpecs: POSpec[] = [
    {
      vendorIdx: 0, orderIdx: 1, status: 'RECEIVED',
      items: [
        { description: '50x Gildan 2000 Ultra Cotton T-Shirt - Safety Orange - Size XL - 5.3oz 100% Cotton', qty: 50, cost: 3.75 },
        { description: '50x Gildan 2000 Ultra Cotton T-Shirt - Safety Orange - Size L - 5.3oz 100% Cotton',  qty: 50, cost: 3.75 },
      ],
    },
    {
      vendorIdx: 2, orderIdx: 1, status: 'RECEIVED',
      items: [
        { description: '2x Siser EasyWeed HTV - Safety Orange - 15" x 5yd Roll - Standard HTV', qty: 2, cost: 28.00 },
        { description: '1x Siser EasyWeed HTV - Black - 12" x 5yd Roll - Standard HTV',         qty: 1, cost: 22.00 },
      ],
    },
    {
      vendorIdx: 0, orderIdx: 2, status: 'SENT',
      items: [
        { description: '100x Bella+Canvas 3001 Unisex Jersey T-Shirt - Athletic Heather - Mixed Sizes (10XS, 15S, 25M, 25L, 15XL, 10-2XL) - 4.2oz', qty: 100, cost: 4.25 },
      ],
    },
    {
      vendorIdx: 1, orderIdx: 2, status: 'SENT',
      items: [
        { description: '10x DTF Gang Sheet 22"x60" - Hot Peel - Matte - White Ink Base - VBS 2024 Logo - 10 designs/sheet (100 total transfers)', qty: 10, cost: 30.00 },
      ],
    },
    {
      vendorIdx: 0, orderIdx: 5, status: 'DRAFT',
      items: [
        { description: '30x Bella+Canvas 3001 Unisex Jersey T-Shirt - Black - Mixed Sizes - 4.2oz Airlume Cotton', qty: 30, cost: 4.25 },
        { description: '15x Bella+Canvas 3719 Unisex Sponge Fleece Hoodie - Black - Mixed Sizes - 7.0oz 52/48 Cotton/Poly', qty: 15, cost: 16.00 },
      ],
    },
    {
      vendorIdx: 0, orderIdx: 4, status: 'RECEIVED',
      items: [
        { description: '35x Comfort Colors 1717 Garment-Dyed Heavyweight T-Shirt - Butter - Mixed Sizes (3S, 8M, 10L, 8XL, 4-2XL, 2-3XL) - 6.1oz Ring-Spun Cotton', qty: 35, cost: 5.75 },
      ],
    },
  ];

  for (const [idx, spec] of poSpecs.entries()) {
    const vendor = vendors[spec.vendorIdx];
    const linkedOrder = orders[spec.orderIdx];
    const total = spec.items.reduce((s, i) => s + i.qty * i.cost, 0);

    const po = await prisma.purchaseOrder.upsert({
      where: {
        poNumber_organizationId: {
          poNumber: `PO-2024-${String(idx + 1).padStart(3, '0')}`,
          organizationId: org.id,
        },
      },
      update: {},
      create: {
        poNumber: `PO-2024-${String(idx + 1).padStart(3, '0')}`,
        vendorId: vendor.id,
        organizationId: org.id,
        status: spec.status as any,
        linkedOrderId: linkedOrder?.id ?? undefined,
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

  console.log(`✓ Purchase Orders: ${poSpecs.length} created`);

  // ─── Shipments ───────────────────────────────────────────────────────────────

  const shipmentSpecs = [
    { orderIdx: 0, tracking: '1Z999AA10123456784',     carrier: 'UPS',  status: 'DELIVERED'  },
    { orderIdx: 6, tracking: '9400111899223100001234', carrier: 'USPS', status: 'IN_TRANSIT' },
    { orderIdx: 4, tracking: '',                        carrier: 'UPS',  status: 'PENDING'    },
  ];

  for (const spec of shipmentSpecs) {
    const carrier = spec.carrier as ShipmentCarrier;
    const existing = await prisma.shipment.findFirst({
      where: {
        organizationId: org.id,
        ...(spec.tracking
          ? { trackingNumber: spec.tracking }
          : { orderId: orders[spec.orderIdx].id, status: spec.status as any }),
      },
    });
    if (!existing) {
      await prisma.shipment.create({
        data: {
          orderId: orders[spec.orderIdx].id,
          organizationId: org.id,
          trackingNumber: spec.tracking || null,
          carrier,
          status: spec.status as any,
        },
      });
    }
  }

  console.log(`✓ Shipments: ${shipmentSpecs.length} created`);

  console.log('\n✅ Seed complete — all entities created successfully');
  console.log(`   Org: ${org.name}`);
  console.log(`   Vendors: ${vendors.length} | Customers: ${customers.length}`);
  console.log(`   Inventory: ${inventoryItems.length} | Orders: ${orders.length}`);
  console.log(`   POs: ${poSpecs.length} | Shipments: ${shipmentSpecs.length}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
