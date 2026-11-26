import { describe, expect, it } from "vitest";

import { ADMIN_PRODUCTS } from "../fixtures/products";
import {
	createProduct,
	deleteProduct,
	isLowOnStock,
	lowestStockVariant,
	orderedGallery,
	parsePricePesos,
	pesosInputValue,
	productCoverImage,
	productDateLabel,
	productPriceFrom,
	productSlug,
	productStockTotal,
	setPublished,
	updateProduct,
	variantSku,
	LOW_STOCK_THRESHOLD,
	type AdminProduct,
	type AdminProductImage,
} from "./product";

const product = (stocks: number[], prices = stocks.map(() => 3_000_000)): AdminProduct => ({
	slug: "apple-tv-4k-2022",
	name: "Apple TV 4K (2022)",
	description: null,
	category: "ACCESSORY",
	gallery: [
		{
			position: 0,
			alt: "Apple TV 4K (2022) — foto principal",
			url: "/products/accessory/apple-tv-4k-2022-1.webp",
		},
	],
	published: true,
	destacado: false,
	createdAt: "2026-11-08T12:00:00.000Z",
	variants: stocks.map((stock, index) => ({
		sku: `apple-tv-4k-2022-${index}`,
		label: null,
		priceCents: prices[index] ?? 0,
		stock,
	})),
});

function photo(position: number, slug: string): AdminProductImage {
	return {
		position,
		alt: `${slug} — foto ${position + 1}`,
		url: `/products/${slug}-${position + 1}.webp`,
	};
}

describe("the gallery a product carries", () => {
	const products = [product([5, 7, 2])];

	it("orders the photographs by their position, not by the order they arrive", () => {
		expect(orderedGallery([photo(1, "apple-tv-4k-2022"), photo(0, "apple-tv-4k-2022")])).toEqual([
			photo(0, "apple-tv-4k-2022"),
			photo(1, "apple-tv-4k-2022"),
		]);
	});

	it("keeps the photographs it was given intact", () => {
		const given = [photo(1, "apple-tv-4k-2022"), photo(0, "apple-tv-4k-2022")];
		const before = structuredClone(given);

		orderedGallery(given);

		expect(given).toEqual(before);
	});

	it("takes the photograph in the first position as the cover", () => {
		expect(
			productCoverImage({
				...product([1]),
				gallery: [photo(1, "apple-tv-4k-2022"), photo(0, "apple-tv-4k-2022")],
			}),
		).toEqual(photo(0, "apple-tv-4k-2022"));
	});

	it("has no cover when the product carries no photographs", () => {
		expect(productCoverImage({ ...product([1]), gallery: [] })).toBeNull();
	});

	it("replaces the gallery when a patch carries one", () => {
		const next = updateProduct(products, "apple-tv-4k-2022", {
			gallery: [photo(1, "apple-tv-4k-2022"), photo(0, "apple-tv-4k-2022")],
		});

		expect(next[0]?.gallery).toEqual([
			photo(0, "apple-tv-4k-2022"),
			photo(1, "apple-tv-4k-2022"),
		]);
	});
});

describe("the low-stock rule", () => {
	it("draws the line at two units", () => {
		expect(LOW_STOCK_THRESHOLD).toBe(2);
	});

	it.each([
		[[0], true],
		[[2], true],
		[[3], false],
		[[9, 1], true],
		[[9, 4], false],
	])("reads %s as low on stock: %s", (stocks, expected) => {
		expect(isLowOnStock(product(stocks))).toBe(expected);
	});

	it("picks the variant with the fewest units", () => {
		expect(lowestStockVariant(product([7, 2, 5]))?.stock).toBe(2);
	});

	it("has nothing to pick on a product without variants", () => {
		expect(lowestStockVariant(product([]))).toBeNull();
	});
});

describe("the price a product shows", () => {
	it("starts at the cheapest variant", () => {
		expect(productPriceFrom(product([5, 2], [90_000_000, 121_500_000]))).toBe(90_000_000);
	});

	it("has no price when the product has no variants", () => {
		expect(productPriceFrom(product([]))).toBeNull();
	});

	it("keeps the catalogue's own prices for the iPads", () => {
		const ipad = ADMIN_PRODUCTS.find(
			(entry) => entry.slug === "apple-ipad-11-a16-chip-wi-fi",
		);

		expect(productPriceFrom(ipad ?? product([]))).toBe(90_000_000);
	});
});

describe("the stock a product holds", () => {
	it("adds every variant's units", () => {
		expect(productStockTotal(product([5, 7, 2]))).toBe(14);
	});

	it("holds nothing when there are no variants", () => {
		expect(productStockTotal(product([]))).toBe(0);
	});

	it("adds the 76 units of the fixture set", () => {
		expect(
			ADMIN_PRODUCTS.reduce((sum, entry) => sum + productStockTotal(entry), 0),
		).toBe(76);
	});
});

describe("the slug a name produces", () => {
	it.each([
		['Apple iPad 11" A16 Chip WI-FI', "apple-ipad-11-a16-chip-wi-fi"],
		["Apple HomePod Mini (2da Generación)", "apple-homepod-mini-2da-generacion"],
		["Apple Watch Ultra 3 — 49mm GPS-CELL", "apple-watch-ultra-3-49mm-gps-cell"],
		["  AirPods   Pro 3  ", "airpods-pro-3"],
		["iPad Pro 11", "ipad-pro-11"],
		["", ""],
		["———", ""],
	])("writes %s as %s", (name, slug) => {
		expect(productSlug(name)).toBe(slug);
	});
});

describe("the SKU a variant gets", () => {
	it.each([
		["apple-ipad-11-a16-chip-wi-fi", "128 GB", "apple-ipad-11-a16-chip-wi-fi-128gb"],
		["apple-ipad-11-a16-chip-wi-fi", "1 TB", "apple-ipad-11-a16-chip-wi-fi-1tb"],
		["apple-ipad-11-a16-chip-wi-fi", "  ", "apple-ipad-11-a16-chip-wi-fi"],
		["apple-ipad-11-a16-chip-wi-fi", null, "apple-ipad-11-a16-chip-wi-fi"],
	])("writes %s with %s as %s", (slug, label, sku) => {
		expect(variantSku(slug, label)).toBe(sku);
	});
});

describe("the price a person types in pesos", () => {
	it.each([
		["1.499.000", 149_900_000],
		["1499000", 149_900_000],
		["$ 1.499.000", 149_900_000],
		["$ 1.499.000", 149_900_000],
		["1.499.000,50", 149_900_050],
		["1,5", 150],
		["0", 0],
		["250000", 25_000_000],
	])("reads %s as %i cents", (typed, cents) => {
		expect(parsePricePesos(typed)).toBe(cents);
	});

	it.each([[""], ["   "], ["abc"], ["-5"], ["12.5"], ["1.499.000,999"], ["1e3"]])(
		"refuses %s",
		(typed) => {
			expect(parsePricePesos(typed)).toBeNull();
		},
	);

	it("writes cents back into the field the same way", () => {
		expect(pesosInputValue(149_900_000)).toBe("1.499.000");
		expect(pesosInputValue(100)).toBe("1");
		expect(pesosInputValue(149_900_050)).toBe("1.499.000,50");
	});
});

describe("creating a product", () => {
	const input = {
		name: 'Apple iPad Pro 11" M5 Space Black',
		description: "iPad Pro de 11 pulgadas con chip M5.",
		category: "IPAD" as const,
		published: true,
		destacado: false,
		createdAt: "2026-11-20T12:00:00.000Z",
		variants: [
			{ label: "128 GB", priceCents: 120_000_000, stock: 6 },
			{ label: "256 GB", priceCents: 149_900_000, stock: 4 },
		],
	};

	it("derives the slug, one SKU per capacity and the creation date", () => {
		const created = createProduct(input);

		expect(created.slug).toBe("apple-ipad-pro-11-m5-space-black");
		expect(created.variants.map((variant) => variant.sku)).toEqual([
			"apple-ipad-pro-11-m5-space-black-128gb",
			"apple-ipad-pro-11-m5-space-black-256gb",
		]);
		expect(created.createdAt).toBe("2026-11-20T12:00:00.000Z");
	});

	it("keeps the flags, the family, the description and no photo", () => {
		const created = createProduct({ ...input, destacado: true, published: false });

		expect(created.destacado).toBe(true);
		expect(created.published).toBe(false);
		expect(created.category).toBe("IPAD");
		expect(created.description).toBe("iPad Pro de 11 pulgadas con chip M5.");
		expect(created.gallery).toEqual([]);
	});

	it("keeps the gallery the form carried, in position order", () => {
		const created = createProduct({
			...input,
			gallery: [photo(1, "apple-ipad-pro-11-m5-space-black"), photo(0, "apple-ipad-pro-11-m5-space-black")],
		});

		expect(created.gallery).toEqual([
			photo(0, "apple-ipad-pro-11-m5-space-black"),
			photo(1, "apple-ipad-pro-11-m5-space-black"),
		]);
	});

	it("trims the name and keeps the catalogue's own spelling", () => {
		const created = createProduct({ ...input, name: '  Apple 15" MacBook Air  ' });

		expect(created.name).toBe('Apple 15" MacBook Air');
	});

	it("refuses a product without a name", () => {
		expect(() => createProduct({ ...input, name: "   " })).toThrow();
	});

	it("refuses a product without variants", () => {
		expect(() => createProduct({ ...input, variants: [] })).toThrow();
	});

	it.each([
		[{ priceCents: 1.5, stock: 2 }],
		[{ priceCents: -1, stock: 2 }],
		[{ priceCents: 1_000, stock: -1 }],
		[{ priceCents: 1_000, stock: 1.5 }],
	])("refuses a variant that is not whole money and whole units: %o", (variant) => {
		expect(() =>
			createProduct({
				...input,
				variants: [{ label: "128 GB", ...variant }],
			}),
		).toThrow();
	});
});

describe("updating a product", () => {
	const products = [product([5, 7, 2]), { ...product([1]), slug: "pencil-pro", name: "Apple Pencil Pro" }];

	it("replaces a variant's price and stock in place", () => {
		const next = updateProduct(products, "apple-tv-4k-2022", {
			variants: [
				{ sku: "apple-tv-4k-2022-0", label: null, priceCents: 3_300_000, stock: 9 },
			],
		});

		expect(next[0]?.variants).toEqual([
			{ sku: "apple-tv-4k-2022-0", label: null, priceCents: 3_300_000, stock: 9 },
		]);
		expect(next[0]?.name).toBe("Apple TV 4K (2022)");
	});

	it("leaves the other rows untouched", () => {
		const next = updateProduct(products, "pencil-pro", { destacado: true });

		expect(next[0]).toBe(products[0]);
		expect(next[1]?.destacado).toBe(true);
	});

	it("keeps the array it was given intact", () => {
		const before = structuredClone(products);

		updateProduct(products, "apple-tv-4k-2022", { destacado: true });

		expect(products).toEqual(before);
	});

	it("returns the same array when the slug is not there", () => {
		expect(updateProduct(products, "no-existe", { destacado: true })).toBe(products);
	});
});

describe("publishing a product", () => {
	const products = ADMIN_PRODUCTS;

	it("sets the flag the table reads", () => {
		const next = setPublished(products, "apple-11-ipad-air-m4-space-gray", true);
		const published = next.find((entry) => entry.slug === "apple-11-ipad-air-m4-space-gray");

		expect(published?.published).toBe(true);
		expect(productPriceFrom(published ?? product([]))).toBe(90_000_000);
	});

	it("takes the flag away too", () => {
		const next = setPublished(products, "airpods-pro-3", false);

		expect(next.find((entry) => entry.slug === "airpods-pro-3")?.published).toBe(false);
	});

	it("changes nothing for a slug that is not there", () => {
		expect(setPublished(products, "no-existe", true)).toBe(products);
	});

	it("does not touch the featured flag", () => {
		const next = setPublished(products, "apple-imac-24-m4-chip-azul", false);

		expect(next.find((entry) => entry.slug === "apple-imac-24-m4-chip-azul")?.destacado).toBe(
			true,
		);
	});
});

describe("deleting a product", () => {
	const products = ADMIN_PRODUCTS;

	it("takes the row out of the list", () => {
		const next = deleteProduct(products, "airpods-pro-3");

		expect(next).toHaveLength(products.length - 1);
		expect(next.some((entry) => entry.slug === "airpods-pro-3")).toBe(false);
	});

	it("keeps the order of the rows that stay", () => {
		const next = deleteProduct(products, "apple-ipad-11-a16-chip-wi-fi");

		expect(next.map((entry) => entry.slug)).toEqual(
			products
				.filter((entry) => entry.slug !== "apple-ipad-11-a16-chip-wi-fi")
				.map((entry) => entry.slug),
		);
	});

	it("returns the same array when there is nothing to delete", () => {
		expect(deleteProduct(products, "no-existe")).toBe(products);
	});
});

describe("the creation date the sheet shows", () => {
	it.each([
		["2026-11-12T12:00:00.000Z", "12 de noviembre de 2026"],
		["2026-11-02T09:30:00.000Z", "2 de noviembre de 2026"],
		["2026-11-30T23:59:00.000Z", "30 de noviembre de 2026"],
	])("writes %s as %s", (iso, label) => {
		expect(productDateLabel(iso)).toBe(label);
	});
});

describe("the fixture set the boards draw", () => {
	it("still carries fourteen products and sixteen variants", () => {
		expect(ADMIN_PRODUCTS).toHaveLength(14);
		expect(
			ADMIN_PRODUCTS.reduce((sum, entry) => sum + entry.variants.length, 0),
		).toBe(16);
	});

	it("keeps twelve published and two featured", () => {
		expect(ADMIN_PRODUCTS.filter((entry) => entry.published)).toHaveLength(12);
		expect(ADMIN_PRODUCTS.filter((entry) => entry.destacado)).toHaveLength(2);
	});

	it("gives every product the catalogue photograph in the first position, named in its alt", () => {
		for (const entry of ADMIN_PRODUCTS) {
			expect(entry.gallery).toHaveLength(1);
			expect(entry.gallery[0]?.position).toBe(0);
			expect(entry.gallery[0]?.url.startsWith("/products/")).toBe(true);
			expect(entry.gallery[0]?.alt).toContain(entry.name);
		}
	});

	it("dates every product inside November 2026", () => {
		for (const entry of ADMIN_PRODUCTS) {
			const date = new Date(entry.createdAt);

			expect(Number.isNaN(date.getTime())).toBe(false);
			expect(date.getUTCFullYear()).toBe(2026);
			expect(date.getUTCMonth()).toBe(10);
		}
	});
});
