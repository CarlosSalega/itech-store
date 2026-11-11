import { describe, expect, it } from "vitest";

import {
	collapseStorages,
	displayName,
	imageAssetCandidates,
	imageAssetPath,
	imageDestination,
	isIphoneProduct,
	mapSourceProduct,
	skuFor,
	slugFromId,
	type SourceProduct,
} from "./source-mapping";

function record(overrides: Partial<SourceProduct> = {}): SourceProduct {
	return {
		id: "iphone-15-pro",
		name: "iPhone 15 Pro",
		category: "Sellados",
		description: "iPhone 15 Pro sellado, 128GB.",
		storages: ["128GB"],
		colors: ["Azul"],
		variants: [{ storage: "128GB", color: "Azul", battery: null, price: 1, stock_status: "in" }],
		...overrides,
	};
}

describe("slugFromId", () => {
	it("derives the slug from an id without a prefix", () => {
		expect(slugFromId("iphone-15-pro")).toBe("iphone-15-pro");
	});

	it("strips the u- prefix used by used units", () => {
		expect(slugFromId("u-iphone-13-128gb")).toBe("iphone-13-128gb");
	});

	it("normalises a messy id into a kebab slug", () => {
		expect(slugFromId("u-iPhone 12 \"Pro\" Máx")).toBe("iphone-12-pro-max");
	});
});

describe("displayName", () => {
	it("appends the condition for a used unit", () => {
		expect(displayName(record({ id: "u-iphone-15", category: "Usados" }))).toBe(
			"iPhone 15 Pro (usado)",
		);
	});

	it("leaves a sealed unit unchanged", () => {
		expect(displayName(record({ category: "Sellados" }))).toBe("iPhone 15 Pro");
	});

	it("does not append the condition twice", () => {
		expect(displayName(record({ name: "iPhone 14 (usado)", category: "Usados" }))).toBe(
			"iPhone 14 (usado)",
		);
	});
});

describe("isIphoneProduct", () => {
	it("keeps sealed and used categories", () => {
		expect(isIphoneProduct(record({ category: "Sellados" }))).toBe(true);
		expect(isIphoneProduct(record({ category: "Usados" }))).toBe(true);
	});

	it("keeps records whose name starts with iPhone even with another category", () => {
		expect(isIphoneProduct(record({ category: "Otros", name: "iPhone 16" }))).toBe(true);
	});

	it("drops records that are neither", () => {
		expect(isIphoneProduct(record({ category: "Otros", name: "Funda" }))).toBe(false);
	});
});

describe("collapseStorages", () => {
	it("keeps one row per distinct capacity, in first-seen order, ignoring colour", () => {
		const product = record({
			storages: ["128GB", "256GB"],
			variants: [
				{ storage: "256GB", color: "Azul" },
				{ storage: "128GB", color: "Negro" },
				{ storage: "256GB", color: "Titanio" },
				{ storage: "128GB", color: "Blanco" },
			],
		});

		expect(collapseStorages(product)).toEqual(["256GB", "128GB"]);
	});

	it("treats different spellings of the same capacity as one", () => {
		const product = record({
			storages: [],
			variants: [{ storage: "1 TB" }, { storage: "1TB" }, { storage: "1 tb" }],
		});

		expect(collapseStorages(product)).toEqual(["1 TB"]);
	});

	it("falls back to the storages list when there are no variants", () => {
		expect(collapseStorages(record({ variants: null, storages: ["512GB"] }))).toEqual(["512GB"]);
	});

	it("ignores blank capacities", () => {
		expect(collapseStorages(record({ variants: [{}, { storage: "  " }], storages: [] }))).toEqual(
			[],
		);
	});
});

describe("skuFor", () => {
	it("appends the storage with non-alphanumerics stripped and lowercase", () => {
		expect(skuFor("iphone-15-pro", "128GB")).toBe("iphone-15-pro-128gb");
		expect(skuFor("iphone-15-pro", "1 TB")).toBe("iphone-15-pro-1tb");
		expect(skuFor("iphone-15-pro", "256 gb")).toBe("iphone-15-pro-256gb");
	});

	it("returns the bare slug when there is no storage", () => {
		expect(skuFor("iphone-15-pro", null)).toBe("iphone-15-pro");
	});
});

describe("imageAssetPath", () => {
	it("builds the site asset path from a name with spaces, quotes and accents", () => {
		expect(imageAssetPath('iPhone 15 "Pro" Máx')).toBe("/products/iphone-15-pro-max.png");
	});

	it("does not repeat the iphone prefix", () => {
		expect(imageAssetPath("iPhone 13")).toBe("/products/iphone-13.png");
	});

	it("prefixes a name that does not carry the family word", () => {
		expect(imageAssetPath('15 Pro "Máx"')).toBe("/products/iphone-15-pro-max.png");
	});
});

describe("imageAssetCandidates", () => {
	it("tries the name as written first, keeping the condition suffix", () => {
		expect(imageAssetCandidates("iPhone 15 (usado)")[0]).toBe("/products/iphone-15-usado.png");
	});

	it("falls back to the bare model, because the site serves one photo per model", () => {
		expect(imageAssetCandidates("iPhone 15 (usado)")).toContain("/products/iphone-15.png");
	});

	it("does not repeat a candidate when there is no suffix to strip", () => {
		expect(imageAssetCandidates("iPhone 16")).toEqual(["/products/iphone-16.png"]);
	});
});

describe("imageDestination", () => {
	it("points at the local products directory, never at the source", () => {
		expect(imageDestination("iphone-15-pro")).toBe("/products/iphone-15-pro-1.png");
	});
});

describe("mapSourceProduct", () => {
	it("maps one record to one destination product with collapsed variants", () => {
		const product = record({
			id: "u-iphone-13",
			name: "iPhone 13",
			category: "Usados",
			variants: [
				{ storage: "128GB", color: "Azul", battery: "89%", price: 500, stock_status: "in" },
				{ storage: "128GB", color: "Negro", battery: "89%", price: 500, stock_status: "in" },
				{ storage: "256GB", color: "Azul", battery: "89%", price: 600, stock_status: "in" },
			],
		});

		expect(mapSourceProduct(product)).toEqual({
			slug: "iphone-13",
			name: "iPhone 13 (usado)",
			description: "iPhone 15 Pro sellado, 128GB.",
			category: "IPHONE",
			images: ["/products/iphone-13-1.png"],
			variants: [
				{ sku: "iphone-13-128gb", storage: "128GB" },
				{ sku: "iphone-13-256gb", storage: "256GB" },
			],
		});
	});

	it("carries no price or stock fields", () => {
		const mapped = mapSourceProduct(record());

		expect(mapped).not.toBeNull();
		expect(Object.keys(mapped ?? {}).sort()).toEqual([
			"category",
			"description",
			"images",
			"name",
			"slug",
			"variants",
		]);
	});

	it("returns null for a record that is not an iPhone product", () => {
		expect(mapSourceProduct(record({ category: "Otros", name: "Funda" }))).toBeNull();
	});
});
