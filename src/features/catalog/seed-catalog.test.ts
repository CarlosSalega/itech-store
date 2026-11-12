import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
	buildSeedCatalog,
	featuredSlugs,
	resolveImages,
	type SeedProduct,
} from "./seed-catalog";

/**
 * The seed makes three decisions that are invisible in the database until they are
 * wrong: which product is featured, which catalog files are merged, and which image
 * reference survives. They live here, away from the script's `main()`, so a test can
 * pin them.
 */

const scratch: string[] = [];

/** A throwaway directory outside the worktree, removed again after the test. */
function makeSeedDir(): string {
	const dir = mkdtempSync(path.join(tmpdir(), "seed-catalog-"));
	scratch.push(dir);

	return dir;
}

function product(
	slug: string,
	category: SeedProduct["category"],
	overrides: Partial<SeedProduct> = {},
): SeedProduct {
	return {
		slug,
		name: slug,
		description: "descripcion",
		category,
		images: [`/products/${slug}-1.webp`],
		variants: [{ sku: slug, storage: null }],
		...overrides,
	};
}

function writeSeedFile(dir: string, file: string, rows: SeedProduct[]): void {
	writeFileSync(path.join(dir, file), `${JSON.stringify(rows, null, "\t")}\n`);
}

afterEach(() => {
	vi.restoreAllMocks();

	for (const dir of scratch.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("buildSeedCatalog", () => {
	it("tolerates an absent extract and reports the split of what it read", () => {
		const dir = makeSeedDir();
		writeSeedFile(dir, "products.json", [product("apple-airtag", "ACCESSORY"), product("ip15", "IPHONE")]);
		writeSeedFile(dir, "products-iphone.json", [product("ip16", "IPHONE")]);
		// products-apple.json is absent on purpose: a fresh clone has not run the extract.
		const log = vi.spyOn(console, "log").mockImplementation(() => {});

		const catalog = buildSeedCatalog(dir);
		const lines = log.mock.calls.map((call) => call.join(" "));

		expect(catalog.products.map((entry) => entry.slug)).toEqual(["apple-airtag", "ip15", "ip16"]);
		expect(lines.some((line) => line.includes("2 from products.json"))).toBe(true);
		expect(lines.some((line) => line.includes("1 from products-iphone.json"))).toBe(true);
		expect(lines.some((line) => line.includes("0 from products-apple.json (absent)"))).toBe(true);
	});

	it("features only from the first two files, so a later extract cannot steal a family", () => {
		// The regression this exists for: an extract whose slug sorts before the current
		// featured product must add catalogue without moving the landing.
		const dir = makeSeedDir();
		writeSeedFile(dir, "products.json", [product("apple-airtag", "ACCESSORY")]);
		writeSeedFile(dir, "products-iphone.json", [product("ip15", "IPHONE")]);
		writeSeedFile(dir, "products-apple.json", [product("adaptador-20w-original", "ACCESSORY")]);

		const { products, featured } = buildSeedCatalog(dir);

		expect(products).toHaveLength(3);
		expect([...featured].sort()).toEqual(["apple-airtag", "ip15"]);
		expect(featured.has("adaptador-20w-original")).toBe(false);
	});
});

describe("featuredSlugs", () => {
	it("features exactly one product per category", () => {
		const featured = featuredSlugs([
			product("apple-airtag", "ACCESSORY"),
			product("adaptador-20w-original", "ACCESSORY"),
			product("ip15", "IPHONE"),
			product("ip16", "IPHONE"),
		]);

		// Alphabetical by slug: the pick is a rule, not a choice made per run.
		expect([...featured].sort()).toEqual(["adaptador-20w-original", "ip15"]);
	});

	it("features the only product of a category that has one", () => {
		const featured = featuredSlugs([product("apple-watch-ultra-3", "WATCH")]);

		expect([...featured]).toEqual(["apple-watch-ultra-3"]);
	});

	it("picks alphabetically, so the same product is featured whatever the file order", () => {
		const rows = [
			product("pencil-pro", "ACCESSORY"),
			product("adaptador-20w-original", "ACCESSORY"),
			product("apple-airtag", "ACCESSORY"),
		];

		expect(featuredSlugs(rows)).toEqual(featuredSlugs([...rows].reverse()));
		expect([...featuredSlugs(rows)]).toEqual(["adaptador-20w-original"]);
	});

	it("features nothing when there is nothing to feature", () => {
		expect(featuredSlugs([])).toEqual(new Set());
	});
});

describe("resolveImages", () => {
	it("keeps a reference nested in its family folder", () => {
		const seen: string[] = [];
		const kept = resolveImages(["/products/iphone/iphone-16-1.png"], (file) => {
			seen.push(file);

			return true;
		});

		expect(kept).toEqual(["/products/iphone/iphone-16-1.png"]);
		// Resolved under `public/`, so the nested form is looked up and not dropped.
		expect(seen).toHaveLength(1);
		expect(seen[0]?.startsWith(path.join(process.cwd(), "public"))).toBe(true);
		expect(seen[0]?.endsWith(path.join("products", "iphone", "iphone-16-1.png"))).toBe(true);
	});

	it("still rejects a nested reference that climbs out of its family folder", () => {
		const kept = resolveImages(
			[
				"/products/iphone/../../outside.webp",
				"/products/iphone/../watch/near-miss.webp",
				"/other/iphone/away.webp",
				"/products/iphone/kept.webp",
			],
			() => true,
		);

		expect(kept).toEqual(["/products/iphone/kept.webp"]);
	});

	it("drops exactly the path whose file is missing and keeps the rest", () => {
		const kept = resolveImages(
			["/products/kept-1.webp", "/products/gone-2.webp", "/products/kept-3.webp"],
			(file) => file.endsWith("kept-1.webp") || file.endsWith("kept-3.webp"),
		);

		expect(kept).toEqual(["/products/kept-1.webp", "/products/kept-3.webp"]);
	});

	it("never keeps an absolute or non-/products path, even when the file exists", () => {
		const kept = resolveImages(
			[
				"/etc/passwd",
				"/placeholder.webp",
				"products/near-miss.webp",
				"https://host/products/remote.webp",
				"/products/../outside.webp",
				"/products/ok.webp",
			],
			() => true,
		);

		expect(kept).toEqual(["/products/ok.webp"]);
	});

	it("ignores absolute paths the filesystem could resolve", () => {
		const seen: string[] = [];
		resolveImages(["/etc/passwd"], (file) => {
			seen.push(file);

			return true;
		});

		expect(seen).toEqual([]);
	});
});
