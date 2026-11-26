-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";

-- DropTable
DROP TABLE "ProductImage";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "published";

-- DeleteMigration
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261126162703_add_product_gallery';
