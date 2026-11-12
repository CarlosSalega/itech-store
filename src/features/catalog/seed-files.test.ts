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

/** The catalogue family, which is also the folder that holds its photography. */
const FAMILY_BY_CATEGORY: Record<string, string> = {
	IPHONE: "iphone",
	IPAD: "ipad",
	MAC: "mac",
	WATCH: "watch",
	AIRPODS: "airpods",
	ACCESSORY: "accessory",
};

/**
 * One reference, one folder: `/products/<family>/<file>`, where the family is the
 * product's own category lowercased and the file name is bare. The folder carries the
 * family so the file name stops having to.
 */
function followsFamilyLayout(image: string, category: string): boolean {
	const family = FAMILY_BY_CATEGORY[category];

	if (family === undefined) return false;

	const prefix = `/products/${family}/`;
	if (!image.startsWith(prefix)) return false;

	const file = image.slice(prefix.length);

	return file.length > 0 && !file.includes("/") && !file.includes("\\") && !file.includes("..");
}

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

describe("the committed photography references", () => {
	it("serves every photograph from its own family folder, with a bare file name", () => {
		// Nothing else catches this: a reference whose file is missing is dropped by the
		// seed and the product silently falls back to the placeholder, so a half-finished
		// migration builds, seeds and renders without a single error.
		const violations = ALL.flatMap((row) =>
			row.images
				.filter((image) => !followsFamilyLayout(image, row.category))
				.map((image) => `${row.slug} (${row.category}): ${image}`),
		);

		expect(violations.length, violations.join("\n")).toBe(0);
	});
});

describe("the three catalog files", () => {
	it("account for every product, so a rewrite cannot drop one in silence", () => {
		// The number only moves on a deliberate edit: 64 from the first extraction, 16 from
		// the phone extract plus the iPhone 11 the owner added by hand, 9 from the extension.
		expect(BASE).toHaveLength(64);
		expect(PHONES).toHaveLength(17);
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
