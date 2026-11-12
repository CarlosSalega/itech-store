import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The review guard over the committed data: the three catalog files merge into one
 * catalogue on `slug`, and variants merge on `sku`, so a duplicate in any of them is a
 * product that disappears or a variant that overwrites another — silently, at seed time.
 *
 * The third file is produced by an extraction, which is exactly where a duplicate or a
 * stray key comes back. These assertions read the real files, not a fixture.
 */

type SeedRow = {
	slug: string;
	name: string;
	description: string;
	category: string;
	images: string[];
	variants: { sku: string; storage: string | null }[];
};

const SEED_DIR = path.join(process.cwd(), "prisma", "seed");

function readSeedFile(file: string): SeedRow[] {
	return JSON.parse(readFileSync(path.join(SEED_DIR, file), "utf8")) as SeedRow[];
}

const BASE = readSeedFile("products.json");
const PHONES = readSeedFile("products-iphone.json");
const APPLE = readSeedFile("products-apple.json");
const ALL = [...BASE, ...PHONES, ...APPLE];

describe("the committed catalog files", () => {
	it("never repeats a slug across the three files", () => {
		const slugs = ALL.map((row) => row.slug);
		const duplicated = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

		expect(duplicated).toEqual([]);
	});

	it("never repeats a variant sku across the three files", () => {
		const skus = ALL.flatMap((row) => row.variants.map((variant) => variant.sku));
		const duplicated = skus.filter((sku, index) => skus.indexOf(sku) !== index);

		expect(duplicated).toEqual([]);
	});
});

describe("the third catalog file", () => {
	it("holds the nine extracted products", () => {
		expect(BASE).toHaveLength(64);
		expect(PHONES).toHaveLength(16);
		expect(APPLE).toHaveLength(9);
	});

	it("carries exactly the agreed keys, so a future extraction cannot smuggle a field in", () => {
		const productKeys = ["slug", "name", "description", "category", "images", "variants"];
		const variantKeys = ["sku", "storage"];

		for (const row of APPLE) {
			expect(Object.keys(row).sort()).toEqual([...productKeys].sort());

			for (const variant of row.variants) {
				expect(Object.keys(variant).sort()).toEqual([...variantKeys].sort());
			}
		}
	});
});
