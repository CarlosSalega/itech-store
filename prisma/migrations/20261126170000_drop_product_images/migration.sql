-- GuardGallery
DO $$
DECLARE
    offending_slug TEXT;
    offending_name TEXT;
BEGIN
    SELECT p."slug", p."name"
    INTO offending_slug, offending_name
    FROM "Product" AS p
    LEFT JOIN (
        SELECT pi."productId", array_agg(pi."url" ORDER BY pi."position") AS "urls"
        FROM "ProductImage" AS pi
        GROUP BY pi."productId"
    ) AS g ON g."productId" = p."id"
    WHERE COALESCE(p."images", ARRAY[]::TEXT[]) IS DISTINCT FROM COALESCE(g."urls", ARRAY[]::TEXT[])
    ORDER BY p."slug"
    LIMIT 1;

    IF offending_slug IS NOT NULL THEN
        RAISE EXCEPTION 'Product % (%) has a gallery that does not reproduce its images array (same length, same order, same urls), so "Product"."images" is not redundant and will not be dropped',
            offending_slug, offending_name;
    END IF;
END
$$;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "images";
