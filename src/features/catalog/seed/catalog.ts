import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Category } from "@/generated/prisma/enums";

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
const PHONE_FILE = "products-iphone.json";
const APPLE_FILE = "products-apple.json";

function readSeedFile(seedDir: string, file: string): SeedProduct[] {
	return JSON.parse(readFileSync(path.join(seedDir, file), "utf8")) as SeedProduct[];
}

function optionalSeedFile(seedDir: string, file: string): SeedProduct[] {
	return existsSync(path.join(seedDir, file)) ? readSeedFile(seedDir, file) : [];
}

export function featuredSlugs(products: readonly SeedProduct[]): Set<string> {
	const firstPerCategory = new Map<string, string>();

	for (const product of [...products].sort((a, b) => a.slug.localeCompare(b.slug))) {
		if (!firstPerCategory.has(product.category)) {
			firstPerCategory.set(product.category, product.slug);
		}
	}

	return new Set(firstPerCategory.values());
}

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
		featured: featuredSlugs([...base, ...phones]),
	};
}

const PUBLIC_DIR = path.resolve(process.cwd(), "public");

export function resolveImages(
	images: readonly string[],
	exists: (file: string) => boolean = (file) => existsSync(file),
): string[] {
	return images.filter((image) => {
		if (!image.startsWith("/products/") || image.includes("..")) return false;

		return exists(path.join(PUBLIC_DIR, image));
	});
}
