-- DropForeignKey
ALTER TABLE "OrderLine" DROP CONSTRAINT "OrderLine_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropIndex
DROP INDEX "OrderLine_orderId_idx";

-- DropIndex
DROP INDEX "Order_createdAt_idx";

-- DropIndex
DROP INDEX "Order_status_idx";

-- DropIndex
DROP INDEX "Order_number_key";

-- DropTable
DROP TABLE "OrderLine";

-- DropTable
DROP TABLE "Order";

-- DropEnum
DROP TYPE "OrderPayment";

-- DropEnum
DROP TYPE "OrderStatus";

-- DeleteMigration
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261127100000_add_order';
