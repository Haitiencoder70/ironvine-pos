-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'VIEWER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "customPermissions" JSONB;
