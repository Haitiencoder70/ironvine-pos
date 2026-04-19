import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.user.count();
  console.log("USER COUNT:", c);
  const users = await prisma.user.findMany({ select: { id: true, role: true, clerkUserId: true, isOrganizationOwner: true, organizationId: true } });
  console.dir(users, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
