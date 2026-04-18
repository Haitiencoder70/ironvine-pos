import { PrismaClient } from '@prisma/client';

const TEST_DB_URL =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://testuser:testpass@localhost:5433/tshirtpos_test';

export const testPrisma = new PrismaClient({
  datasources: { db: { url: TEST_DB_URL } },
  log: [],
});
