-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "images" TEXT[];

-- RestoreGallery
UPDATE "Product" AS p
SET "images" = COALESCE(
    (
        SELECT array_agg(pi."url" ORDER BY pi."position")
        FROM "ProductImage" AS pi
        WHERE pi."productId" = p."id"
    ),
    '{}'
);

-- DeleteMigration
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261126170000_drop_product_images';
