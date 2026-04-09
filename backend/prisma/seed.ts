import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Create a default organization for local development.
  // In production, organizations are created via Clerk org creation webhook.
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-tshirt-co' },
    update: {},
    create: {
      clerkOrgId: 'org_demo_placeholder',
      slug: 'demo-tshirt-co',
      name: 'Demo T-Shirt Co',
      subdomain: 'demo',
      plan: 'FREE',
      orderNumberPrefix: 'ORD',
      currency: 'USD',
      timezone: 'America/New_York',
      taxRate: 0.0875,
    },
  });

  console.log(`✓ Organization: ${org.name} (${org.id})`);

  // Create sample vendors
  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { name_organizationId: { name: 'Blank Shirt Supply Co', organizationId: org.id } },
      update: {},
      create: {
        name: 'Blank Shirt Supply Co',
        contactName: 'John Smith',
        email: 'orders@blanksupply.example',
        phone: '555-0100',
        categories: ['BLANK_SHIRTS'],
        paymentTerms: 'Net 30',
        leadTimeDays: 5,
        organizationId: org.id,
      },
    }),
    prisma.vendor.upsert({
      where: { name_organizationId: { name: 'DTF Print Masters', organizationId: org.id } },
      update: {},
      create: {
        name: 'DTF Print Masters',
        contactName: 'Jane Doe',
        email: 'orders@dtfmasters.example',
        phone: '555-0200',
        categories: ['DTF_TRANSFERS'],
        paymentTerms: 'Net 15',
        leadTimeDays: 3,
        organizationId: org.id,
      },
    }),
  ]);

  console.log(`✓ Vendors: ${vendors.length} created`);

  // Create sample inventory items
  const inventoryItems = await Promise.all([
    prisma.inventoryItem.upsert({
      where: { sku_organizationId: { sku: 'BLANK-BKTEE-BLK-M', organizationId: org.id } },
      update: {},
      create: {
        sku: 'BLANK-BKTEE-BLK-M',
        name: 'Blank T-Shirt - Black - Medium',
        category: 'BLANK_SHIRTS',
        brand: 'Bella+Canvas',
        size: 'M',
        color: 'Black',
        quantityOnHand: 50,
        reorderPoint: 20,
        reorderQuantity: 100,
        costPrice: 4.50,
        organizationId: org.id,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { sku_organizationId: { sku: 'BLANK-BKTEE-WHT-M', organizationId: org.id } },
      update: {},
      create: {
        sku: 'BLANK-BKTEE-WHT-M',
        name: 'Blank T-Shirt - White - Medium',
        category: 'BLANK_SHIRTS',
        brand: 'Bella+Canvas',
        size: 'M',
        color: 'White',
        quantityOnHand: 50,
        reorderPoint: 20,
        reorderQuantity: 100,
        costPrice: 4.50,
        organizationId: org.id,
      },
    }),
    prisma.inventoryItem.upsert({
      where: { sku_organizationId: { sku: 'DTF-12X10-FULL', organizationId: org.id } },
      update: {},
      create: {
        sku: 'DTF-12X10-FULL',
        name: 'DTF Transfer - 12x10 Full Color',
        category: 'DTF_TRANSFERS',
        quantityOnHand: 0,
        reorderPoint: 10,
        reorderQuantity: 50,
        costPrice: 2.75,
        organizationId: org.id,
      },
    }),
  ]);

  console.log(`✓ Inventory items: ${inventoryItems.length} created`);

  // Create a sample customer
  const customer = await prisma.customer.upsert({
    where: { email_organizationId: { email: 'alice@example.com', organizationId: org.id } },
    update: {},
    create: {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'alice@example.com',
      phone: '555-0300',
      company: 'Johnson Events LLC',
      organizationId: org.id,
    },
  });

  console.log(`✓ Customer: ${customer.firstName} ${customer.lastName}`);

  console.log('\nSeed complete ✓');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
