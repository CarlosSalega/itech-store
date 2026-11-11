/**
 * Catalog seed — loads `prisma/seed/products.json` into the database.
 *
 * ============================================================================
 * SAMPLE DATA: PRICES AND STOCK ARE PLACEHOLDERS, NOT REAL VALUES.
 * ============================================================================
 * Every `price` and `stock` written by this script is derived from fixed,
 * arbitrary rules (a per-category base price and a storage multiplier for
 * prices, a hash of the SKU for stock). No real price exists in this file and
 * none was fetched from any store. Real prices arrive later, replacing only the
 * two functions below (`priceInCents` and `stockForSku`); the catalog model and
 * this seed's shape stay unchanged.
 *
 * The decision that seed prices and stock are sample values ("de ejemplo,
 * reales después") is recorded in `odd/tasks/public-catalog-mvp.md`, spec S7
 * and log entry L8, and the public README rewrite (task T10) carries the same
 * warning for users of the store.
 *
 * Rules (fixed, do not improvise a different scheme):
 *   - `price` is an integer number of cents in ARS (1 ARS = 100 cents). Money
 *     never uses floating point.
 *   - price = round(category base × storage multiplier), bases in cents below.
 *   - stock = (sum of the SKU's character codes) % 8 + 1, so re-runs are stable.
 * ============================================================================
 *
 * The seed is idempotent: products are upserted on `slug` and variants on
 * `sku`, so running it twice leaves 64 products and 68 variants. Rows are never
 * deleted or recreated.
 *
 * Images are local-only and gitignored, so a clone has the image paths but not
 * the files. `resolveImages` keeps only paths whose file exists on this
 * machine; the catalog UI renders `/placeholder.webp` for products left with
 * none, which is exactly what a fresh clone sees.
 */

import "dotenv/config";

import { existsSync } from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { Category, PrismaClient } from "../src/generated/prisma/client";
import catalogJson from "./seed/products.json";

type SeedVariant = { sku: string; storage: string | null };

type SeedProduct = {
	slug: string;
	name: string;
	description: string;
	category: Category;
	images: string[];
	variants: SeedVariant[];
};

/** Base sample price per category, in integer cents (ARS). */
const CATEGORY_BASE_CENTS: Record<Category, number> = {
	IPHONE: 150_000_000,
	MAC: 200_000_000,
	IPAD: 90_000_000,
	WATCH: 60_000_000,
	AIRPODS: 25_000_000,
	ACCESSORY: 3_000_000,
};

/** Sample capacity multiplier applied to the category base price. */
const STORAGE_MULTIPLIER: Record<string, number> = {
	"128GB": 1.0,
	"256GB": 1.15,
	"512GB": 1.35,
	"1TB": 1.6,
	"2TB": 1.9,
};

/** Storage multiplier lookup: case-insensitive, 1.0 for unrecognised values. */
function storageMultiplier(storage: string | null): number {
	if (storage === null) return 1.0;
	const key = storage.trim().toUpperCase();
	return Object.hasOwn(STORAGE_MULTIPLIER, key)
		? STORAGE_MULTIPLIER[key]
		: 1.0;
}

/** Sample price in integer cents: category base × storage multiplier, rounded. */
function priceInCents(product: SeedProduct, variant: SeedVariant): number {
	return Math.round(
		CATEGORY_BASE_CENTS[product.category] * storageMultiplier(variant.storage),
	);
}

/** Sample stock derived from the SKU, stable across runs. */
function stockForSku(sku: string): number {
	let sum = 0;
	for (const char of sku) sum += char.codePointAt(0) ?? 0;
	return (sum % 8) + 1;
}

/** Format integer cents as an ARS amount for the summary output. */
function formatArs(cents: number): string {
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		maximumFractionDigits: 2,
	}).format(cents / 100);
}

/**
 * Editorial pick for the landing, applied ONLY when a product is first created:
 * the alphabetically first product of each family. The database is the source of
 * truth afterwards, so a manual change is never overwritten by a re-seed.
 */
export function featuredSlugs(catalog: SeedProduct[]): Set<string> {
	const firstPerCategory = new Map<string, string>();

	for (const product of [...catalog].sort((a, b) => a.slug.localeCompare(b.slug))) {
		if (!firstPerCategory.has(product.category)) {
			firstPerCategory.set(product.category, product.slug);
		}
	}

	return new Set(firstPerCategory.values());
}

const PUBLIC_DIR = path.resolve(process.cwd(), "public");

/**
 * Images live under `public/` and are never committed. Keep only the references
 * whose file exists right now, so the database never advertises an image the
 * running app cannot serve.
 */
export function resolveImages(images: string[]): string[] {
	return images.filter((image) => {
		if (!image.startsWith("/")) return false;

		return existsSync(path.join(PUBLIC_DIR, image));
	});
}

async function main() {
	const connectionString = process.env["DATABASE_URL"];
	if (!connectionString) {
		throw new Error("DATABASE_URL is not set; cannot seed the database.");
	}

	const prisma = new PrismaClient({
		adapter: new PrismaPg({ connectionString }),
	});

	const catalog = catalogJson as SeedProduct[];
	const featured = featuredSlugs(catalog);

	let productsUpserted = 0;
	let variantsUpserted = 0;
	let imagesKept = 0;
	let imagesDropped = 0;
	let minPrice = Number.POSITIVE_INFINITY;
	let maxPrice = Number.NEGATIVE_INFINITY;

	try {
		for (const product of catalog) {
			const images = resolveImages(product.images);
			imagesKept += images.length;
			imagesDropped += product.images.length - images.length;

			const productData = {
				name: product.name,
				description: product.description,
				category: product.category,
				images,
			};

			const record = await prisma.product.upsert({
				where: { slug: product.slug },
				create: { slug: product.slug, ...productData, featured: featured.has(product.slug) },
				update: productData,
			});
			productsUpserted += 1;

			for (const variant of product.variants) {
				const price = priceInCents(product, variant);
				const stock = stockForSku(variant.sku);
				const variantData = {
					productId: record.id,
					storage: variant.storage,
					price,
					stock,
				};

				await prisma.variant.upsert({
					where: { sku: variant.sku },
					create: { sku: variant.sku, ...variantData },
					update: variantData,
				});
				variantsUpserted += 1;

				minPrice = Math.min(minPrice, price);
				maxPrice = Math.max(maxPrice, price);
			}
		}

		const [storedProducts, storedVariants] = await Promise.all([
			prisma.product.count(),
			prisma.variant.count(),
		]);

		console.log("Seed summary (sample prices and stock, not real data)");
		console.log(`Products upserted: ${productsUpserted}`);
		console.log(`Variants upserted: ${variantsUpserted}`);
		console.log(
			`Price range written: ${formatArs(minPrice)} - ${formatArs(maxPrice)} ` +
				`(${minPrice}-${maxPrice} cents)`,
		);
		console.log(`Totals now in database: ${storedProducts} products, ${storedVariants} variants`);
		console.log(
			`Images kept: ${imagesKept}` +
				(imagesDropped > 0
					? `, dropped ${imagesDropped} whose file is missing (the UI falls back to /placeholder.webp)`
					: ""),
		);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
