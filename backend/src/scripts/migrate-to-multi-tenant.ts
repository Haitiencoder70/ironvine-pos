/**
 * migrate-to-multi-tenant.ts
 *
 * One-time migration helper for databases that pre-date multi-tenancy.
 * Finds records missing organizationId, creates a "default" org if none exists,
 * and assigns all orphaned records to it.
 *
 * Idempotent — safe to run multiple times. Already-assigned records are skipped.
 *
 * Usage:
 *   cd backend
 *   npx tsx src/scripts/migrate-to-multi-tenant.ts
 *
 * After running, verify no orphans remain:
 *   SELECT COUNT(*) FROM orders WHERE "organizationId" IS NULL;
 */

import { PrismaClient, SubscriptionPlan } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ORG_SLUG = 'default';
const DEFAULT_ORG_NAME = 'Default Organization';
const DEFAULT_ORG_CLERK_ID = 'org_migrated_default';

async function ensureDefaultOrg(): Promise<string> {
  const existing = await prisma.organization.findUnique({
    where: { slug: DEFAULT_ORG_SLUG },
  });

  if (existing) {
    console.log(`  Default org already exists (id: ${existing.id})`);
    return existing.id;
  }

  const org = await prisma.organization.create({
    data: {
      slug: DEFAULT_ORG_SLUG,
      name: DEFAULT_ORG_NAME,
      subdomain: DEFAULT_ORG_SLUG,
      clerkOrgId: DEFAULT_ORG_CLERK_ID,
      plan: SubscriptionPlan.FREE,
    },
  });

  console.log(`  Created default org (id: ${org.id})`);
  return org.id;
}

interface MigrationResult {
  table: string;
  orphans: number;
  migrated: number;
}

async function migrateTable(
  orgId: string,
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findMany: () => Promise<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateMany: (ids: string[]) => Promise<any>,
): Promise<MigrationResult> {
  const orphans = await findMany();

  if (orphans.length === 0) {
    return { table, orphans: 0, migrated: 0 };
  }

  const ids = orphans.map((r: { id: string }) => r.id);
  await updateMany(ids);

  return { table, orphans: orphans.length, migrated: orphans.length };
}

async function main(): Promise<void> {
  console.log('Starting multi-tenant migration...\n');

  // Check if any org exists at all — if so, migration may already be done
  const orgCount = await prisma.organization.count();
  console.log(`Found ${orgCount} existing organization(s).`);

  console.log('\n→ Ensuring default organization exists...');
  const orgId = await ensureDefaultOrg();

  console.log('\n→ Scanning for orphaned records...\n');

  const results: MigrationResult[] = [];

  // Customers
  results.push(
    await migrateTable(
      orgId,
      'customers',
      () => prisma.customer.findMany({ where: { organizationId: '' }, select: { id: true } }),
      (ids) => prisma.customer.updateMany({ where: { id: { in: ids } }, data: { organizationId: orgId } }),
    ),
  );

  // Orders
  results.push(
    await migrateTable(
      orgId,
      'orders',
      () => prisma.order.findMany({ where: { organizationId: '' }, select: { id: true } }),
      (ids) => prisma.order.updateMany({ where: { id: { in: ids } }, data: { organizationId: orgId } }),
    ),
  );

  // Products
  results.push(
    await migrateTable(
      orgId,
      'products',
      () => prisma.product.findMany({ where: { organizationId: '' }, select: { id: true } }),
      (ids) => prisma.product.updateMany({ where: { id: { in: ids } }, data: { organizationId: orgId } }),
    ),
  );

  // Product categories
  results.push(
    await migrateTable(
      orgId,
      'product_categories',
      () => prisma.productCategory.findMany({ where: { organizationId: '' }, select: { id: true } }),
      (ids) => prisma.productCategory.updateMany({ where: { id: { in: ids } }, data: { organizationId: orgId } }),
    ),
  );

  // Inventory items
  results.push(
    await migrateTable(
      orgId,
      'inventory_items',
      () => prisma.inventoryItem.findMany({ where: { organizationId: '' }, select: { id: true } }),
      (ids) => prisma.inventoryItem.updateMany({ where: { id: { in: ids } }, data: { organizationId: orgId } }),
    ),
  );

  // Users
  results.push(
    await migrateTable(
      orgId,
      'users',
      () => prisma.user.findMany({ where: { organizationId: '' }, select: { id: true } }),
      (ids) => prisma.user.updateMany({ where: { id: { in: ids } }, data: { organizationId: orgId } }),
    ),
  );

  // Vendors
  results.push(
    await migrateTable(
      orgId,
      'vendors',
      () => prisma.vendor.findMany({ where: { organizationId: '' }, select: { id: true } }),
      (ids) => prisma.vendor.updateMany({ where: { id: { in: ids } }, data: { organizationId: orgId } }),
    ),
  );

  // Activity logs
  results.push(
    await migrateTable(
      orgId,
      'activity_logs',
      () => prisma.activityLog.findMany({ where: { organizationId: '' }, select: { id: true } }),
      (ids) => prisma.activityLog.updateMany({ where: { id: { in: ids } }, data: { organizationId: orgId } }),
    ),
  );

  // Print results table
  const totalOrphans = results.reduce((sum, r) => sum + r.orphans, 0);
  const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);

  console.log('Results:\n');
  console.log('  Table                  Orphans   Migrated');
  console.log('  ─────────────────────  ────────  ────────');
  for (const r of results) {
    const table = r.table.padEnd(22);
    const orphans = String(r.orphans).padStart(7);
    const migrated = String(r.migrated).padStart(8);
    console.log(`  ${table} ${orphans}  ${migrated}`);
  }
  console.log('  ─────────────────────  ────────  ────────');
  console.log(`  TOTAL                  ${String(totalOrphans).padStart(7)}  ${String(totalMigrated).padStart(8)}`);

  if (totalMigrated === 0) {
    console.log('\nNo orphaned records found — database is already multi-tenant-ready.');
  } else {
    console.log(`\nMigrated ${totalMigrated} records to default org (id: ${orgId}).`);
    console.log('Review the data in your DB and reassign records to correct orgs if needed.');
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
