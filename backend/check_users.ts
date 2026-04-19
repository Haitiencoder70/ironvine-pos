import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.dir(users, { depth: null });
  const orgs = await prisma.organization.findMany();
  console.dir(orgs, { depth: null });
  const activities = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  console.dir(activities, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
