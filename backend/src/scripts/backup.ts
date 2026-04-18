/**
 * Backup script — exports all organization data to JSON and uploads to S3-compatible storage.
 *
 * Usage: npx ts-node src/scripts/backup.ts
 * Schedule: daily via cron / Render cron job / GitHub Actions
 *
 * Requires env vars:
 *   BACKUP_BUCKET_URL  — S3/Backblaze B2/R2 bucket endpoint
 *   BACKUP_ACCESS_KEY  — access key ID
 *   BACKUP_SECRET_KEY  — secret access key
 *   DATABASE_URL       — Prisma connection string
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function exportOrganization(orgId: string): Promise<Record<string, unknown>> {
  const [org, orders, customers, inventory, vendors, purchaseOrders] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.order.findMany({ where: { organizationId: orgId }, include: { items: true } }),
    prisma.customer.findMany({ where: { organizationId: orgId } }),
    prisma.inventoryItem.findMany({ where: { organizationId: orgId } }),
    prisma.vendor.findMany({ where: { organizationId: orgId } }),
    prisma.purchaseOrder.findMany({ where: { organizationId: orgId }, include: { items: true } }),
  ]);

  return { organization: org, orders, customers, inventory, vendors, purchaseOrders };
}

async function run(): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0]!;
  const outDir = path.join(process.cwd(), 'tmp', 'backups', timestamp);
  fs.mkdirSync(outDir, { recursive: true });

  const organizations = await prisma.organization.findMany({ select: { id: true, slug: true } });
  console.log(`Backing up ${organizations.length} organizations…`);

  for (const org of organizations) {
    const data = await exportOrganization(org.id);
    const filePath = path.join(outDir, `${org.slug}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  ✓ ${org.slug} → ${filePath}`);
  }

  // Upload to S3-compatible storage using AWS CLI if configured
  const bucketUrl = process.env['BACKUP_BUCKET_URL'];
  if (bucketUrl) {
    try {
      execSync(
        `aws s3 sync ${outDir} ${bucketUrl}/${timestamp}/ ` +
        `--endpoint-url=${bucketUrl} ` +
        `--delete`,
        { env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: process.env['BACKUP_ACCESS_KEY'] ?? '',
          AWS_SECRET_ACCESS_KEY: process.env['BACKUP_SECRET_KEY'] ?? '',
        }},
      );
      console.log(`Uploaded to ${bucketUrl}/${timestamp}/`);
    } catch (err) {
      console.error('Upload failed — backup saved locally only', err);
    }
  } else {
    console.warn('BACKUP_BUCKET_URL not set — backup saved locally only');
  }

  await prisma.$disconnect();
}

void run().catch((err) => {
  console.error(err);
  process.exit(1);
});
