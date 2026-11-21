import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Category } from "@/generated/prisma/enums";

/**
 * The seed's pure decisions, kept out of `prisma/seed.ts` because that script runs
 * `main()` on import and therefore cannot be imported by a test.
 *
 * Three of them decide what the store shows and are silent when wrong: which catalog
 * files are merged, which product is featured on the landing, and which image reference
 * survives. They live here so a test can pin them.
 */

export type SeedVariant = { sku: string; storage: string | null };

export type SeedProduct = {
	slug: string;
	name: string;
	description: string;
	category: Category;
	images: string[];
	variants: SeedVariant[];
};

const BASE_FILE = "products.json";
/** Extracted from a second catalog source; absent unless that run happened. */
const PHONE_FILE = "products-iphone.json";
/** Extracted from a third catalog source; absent unless that run happened. */
const APPLE_FILE = "products-apple.json";

function readSeedFile(seedDir: string, file: string): SeedProduct[] {
	return JSON.parse(readFileSync(path.join(seedDir, file), "utf8")) as SeedProduct[];
}

function optionalSeedFile(seedDir: string, file: string): SeedProduct[] {
	return existsSync(path.join(seedDir, file)) ? readSeedFile(seedDir, file) : [];
}

/**
 * The editorial pick for the landing: the alphabetically first product of each family,
 * stable across runs because the comparison is by slug, not by file order.
 */
export function featuredSlugs(products: readonly SeedProduct[]): Set<string> {
	const firstPerCategory = new Map<string, string>();

	for (const product of [...products].sort((a, b) => a.slug.localeCompare(b.slug))) {
		if (!firstPerCategory.has(product.category)) {
			firstPerCategory.set(product.category, product.slug);
		}
	}

	return new Set(firstPerCategory.values());
}

/**
 * Every product of the three files, plus the slugs to feature.
 *
 * Each extract is optional and skipped silently when absent, but the split is always
 * reported so the seed output says where its products came from.
 */
export function buildSeedCatalog(seedDir: string): {
	products: SeedProduct[];
	featured: Set<string>;
} {
	const base = readSeedFile(seedDir, BASE_FILE);
	const phones = optionalSeedFile(seedDir, PHONE_FILE);
	const apple = optionalSeedFile(seedDir, APPLE_FILE);

	console.log(
		`Catalog files: ${base.length} from ${BASE_FILE}, ` +
			`${phones.length} from ${PHONE_FILE}` +
			(phones.length === 0 ? " (absent)" : "") +
			`, ${apple.length} from ${APPLE_FILE}` +
			(apple.length === 0 ? " (absent)" : ""),
	);

	return {
		products: [...base, ...phones, ...apple],
		// Derived from the first two files only, never from the concatenation above: an
		// extract adds catalogue to the store, it never moves a family's landing pick.
		featured: featuredSlugs([...base, ...phones]),
	};
}

const PUBLIC_DIR = path.resolve(process.cwd(), "public");

/**
 * Images live under `public/` and are never committed. Keep only the references whose
 * file exists right now, so the database never advertises an image the running app
 * cannot serve. `exists` is injectable so the rule can be tested without a filesystem.
 */
export function resolveImages(
	images: readonly string[],
	exists: (file: string) => boolean = (file) => existsSync(file),
): string[] {
	return images.filter((image) => {
		// Only this store's own product photography: never an absolute path, an outside
		// address, or a reference that climbs out of `public/`.
		if (!image.startsWith("/products/") || image.includes("..")) return false;

		return exists(path.join(PUBLIC_DIR, image));
	});
}
