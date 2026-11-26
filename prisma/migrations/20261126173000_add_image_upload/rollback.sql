-- DropForeignKey
ALTER TABLE "ImageUpload" DROP CONSTRAINT "ImageUpload_userId_fkey";

-- DropIndex
DROP INDEX "ImageUpload_userId_idx";

-- DropIndex
DROP INDEX "ImageUpload_key_key";

-- DropTable
DROP TABLE "ImageUpload";

-- DeleteMigration
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261126173000_add_image_upload';
