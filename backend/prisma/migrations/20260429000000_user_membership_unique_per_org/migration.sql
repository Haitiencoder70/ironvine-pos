DROP INDEX IF EXISTS "users_clerkUserId_key";

CREATE UNIQUE INDEX "users_clerkUserId_organizationId_key" ON "users"("clerkUserId", "organizationId");
