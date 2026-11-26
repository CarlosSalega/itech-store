-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "alt" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_position_key" ON "ProductImage"("productId", "position");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BackfillGallery
INSERT INTO "ProductImage" ("id", "productId", "position", "alt", "url")
SELECT
    gen_random_uuid()::text,
    p."id",
    (image."ordinality" - 1)::int,
    CASE
        WHEN image."ordinality" = 1 THEN p."name" || ' — foto principal'
        ELSE p."name" || ' — foto ' || image."ordinality"
    END,
    image."url"
FROM "Product" p
CROSS JOIN LATERAL unnest(p."images") WITH ORDINALITY AS image("url", "ordinality")
WHERE p."images" IS NOT NULL;
