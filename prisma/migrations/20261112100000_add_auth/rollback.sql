-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Verification";

-- DropEnum
DROP TYPE "Role";

-- DeleteMigration
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261112100000_add_auth';
