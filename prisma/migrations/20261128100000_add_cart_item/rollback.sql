-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_variantId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_userId_fkey";

-- DropIndex
DROP INDEX "CartItem_userId_variantId_key";

-- DropIndex
DROP INDEX "CartItem_userId_idx";

-- DropTable
DROP TABLE "CartItem";

-- DeleteMigration
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261128100000_add_cart_item';
