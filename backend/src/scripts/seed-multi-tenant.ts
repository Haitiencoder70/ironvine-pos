/**
 * seed-multi-tenant.ts
 *
 * Seeds 3 demo organizations for local development, E2E testing, and manual QA.
 * Idempotent — skips any org that already exists (matched by slug).
 *
 * Usage:
 *   cd backend
 *   npx tsx src/scripts/seed-multi-tenant.ts
 */

import { PrismaClient, SubscriptionPlan, UserRole, OrderStatus, GarmentType, PrintMethod } from '@prisma/client';

const prisma = new PrismaClient();

interface OrgSeed {
  slug: string;
  name: string;
  subdomain: string;
  clerkOrgId: string;
  plan: SubscriptionPlan;
  maxOrders: number;
  maxCustomers: number;
  maxUsers: number;
  maxInventoryItems: number;
}

const ORGS: OrgSeed[] = [
  {
    slug: 'acme',
    name: 'Acme Prints',
    subdomain: 'acme',
    clerkOrgId: 'org_seed_acme',
    plan: SubscriptionPlan.FREE,
    maxOrders: 3, // kept low to make limit-enforcement tests fast
    maxCustomers: 10,
    maxUsers: 2,
    maxInventoryItems: 20,
  },
  {
    slug: 'riviera',
    name: 'Riviera Tees',
    subdomain: 'riviera',
    clerkOrgId: 'org_seed_riviera',
    plan: SubscriptionPlan.PRO,
    maxOrders: 5000,
    maxCustomers: 2000,
    maxUsers: 10,
    maxInventoryItems: 5000,
  },
  {
    slug: 'blueprint',
    name: 'Blueprint Apparel',
    subdomain: 'blueprint',
    clerkOrgId: 'org_seed_blueprint',
    plan: SubscriptionPlan.ENTERPRISE,
    maxOrders: 999999,
    maxCustomers: 999999,
    maxUsers: 999999,
    maxInventoryItems: 999999,
  },
];

async function seedOrg(seed: OrgSeed): Promise<string> {
  const existing = await prisma.organization.findUnique({ where: { slug: seed.slug } });
  if (existing) {
    console.log(`  [skip] org "${seed.slug}" already exists (id: ${existing.id})`);
    return existing.id;
  }

  const org = await prisma.organization.create({
    data: {
      slug: seed.slug,
      name: seed.name,
      subdomain: seed.subdomain,
      clerkOrgId: seed.clerkOrgId,
      plan: seed.plan,
      maxOrders: seed.maxOrders,
      maxCustomers: seed.maxCustomers,
      maxUsers: seed.maxUsers,
      maxInventoryItems: seed.maxInventoryItems,
    },
  });

  console.log(`  [created] org "${seed.slug}" (id: ${org.id}, plan: ${seed.plan})`);
  return org.id;
}

async function seedProductCategory(orgId: string, name: string): Promise<string> {
  const existing = await prisma.productCategory.findFirst({
    where: { organizationId: orgId, name },
  });
  if (existing) return existing.id;

  const cat = await prisma.productCategory.create({
    data: { name, organizationId: orgId },
  });
  return cat.id;
}

async function seedProduct(orgId: string, categoryId: string, name: string, basePrice: number): Promise<string> {
  const existing = await prisma.product.findFirst({
    where: { organizationId: orgId, name },
  });
  if (existing) return existing.id;

  const product = await prisma.product.create({
    data: {
      name,
      organizationId: orgId,
      categoryId,
      garmentType: GarmentType.TSHIRT,
      printMethod: PrintMethod.DTF,
      basePrice,
      includedPrintLocations: ['FRONT'],
      maxPrintLocations: 2,
      availableBrands: ['Gildan', 'Bella+Canvas'],
    },
  });
  return product.id;
}

async function seedCustomer(
  orgId: string,
  firstName: string,
  lastName: string,
  email: string,
): Promise<string> {
  const existing = await prisma.customer.findFirst({
    where: { organizationId: orgId, email },
  });
  if (existing) return existing.id;

  const customer = await prisma.customer.create({
    data: { firstName, lastName, email, organizationId: orgId },
  });
  return customer.id;
}

async function seedOrder(
  orgId: string,
  customerId: string,
  productId: string,
  orderNumber: string,
): Promise<void> {
  const existing = await prisma.order.findFirst({
    where: { organizationId: orgId, orderNumber },
  });
  if (existing) return;

  await prisma.order.create({
    data: {
      orderNumber,
      organizationId: orgId,
      customerId,
      status: OrderStatus.PENDING_APPROVAL,
      subtotal: 125.00,
      taxAmount: 10.00,
      discount: 0,
      total: 135.00,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            productId,
            quantity: 10,
            unitPrice: 12.50,
            size: 'L',
            color: 'Black',
          },
        ],
      },
    },
  });
}

async function seedInventory(orgId: string, name: string, sku: string): Promise<void> {
  const existing = await prisma.inventoryItem.findFirst({
    where: { organizationId: orgId, sku },
  });
  if (existing) return;

  await prisma.inventoryItem.create({
    data: {
      name,
      sku,
      quantity: 200,
      reorderPoint: 20,
      organizationId: orgId,
    },
  });
}

async function main(): Promise<void> {
  console.log('Seeding multi-tenant demo data...\n');

  for (const seed of ORGS) {
    console.log(`→ ${seed.name} (${seed.slug})`);
    const orgId = await seedOrg(seed);

    // Product category + product
    const catId = await seedProductCategory(orgId, 'T-Shirts');
    const productId = await seedProduct(orgId, catId, 'Classic Tee', 25.00);

    // Customers
    const cust1 = await seedCustomer(orgId, 'Jane', 'Smith', `jane@${seed.slug}.example.com`);
    const cust2 = await seedCustomer(orgId, 'Bob', 'Jones', `bob@${seed.slug}.example.com`);

    // Orders (only 1 for acme so FREE limit tests start with headroom)
    await seedOrder(orgId, cust1, productId, `${seed.slug.toUpperCase()}-0001`);
    if (seed.plan !== SubscriptionPlan.FREE) {
      await seedOrder(orgId, cust2, productId, `${seed.slug.toUpperCase()}-0002`);
    }

    // Inventory
    await seedInventory(orgId, 'Gildan 5000 Black L', `${seed.slug.toUpperCase()}-G5000-BLK-L`);
    await seedInventory(orgId, 'Gildan 5000 White M', `${seed.slug.toUpperCase()}-G5000-WHT-M`);

    console.log(`  [done] seeded products, customers, orders, inventory for "${seed.slug}"\n`);
  }

  console.log('Done. Demo orgs ready:');
  console.log('  http://acme.localhost:5173      (FREE  — maxOrders=3)');
  console.log('  http://riviera.localhost:5173   (PRO)');
  console.log('  http://blueprint.localhost:5173 (ENTERPRISE)');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
