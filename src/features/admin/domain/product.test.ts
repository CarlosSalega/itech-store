import { describe, expect, it } from "vitest";

import { ADMIN_PRODUCTS } from "../fixtures/products";
import {
	isLowOnStock,
	lowestStockVariant,
	productPriceFrom,
	LOW_STOCK_THRESHOLD,
	type AdminProduct,
} from "./product";

const product = (stocks: number[], prices = stocks.map(() => 3_000_000)): AdminProduct => ({
	slug: "apple-tv-4k-2022",
	name: "Apple TV 4K (2022)",
	category: "ACCESSORY",
	image: "/products/accessory/apple-tv-4k-2022-1.webp",
	published: true,
	variants: stocks.map((stock, index) => ({
		sku: `apple-tv-4k-2022-${index}`,
		label: null,
		priceCents: prices[index] ?? 0,
		stock,
	})),
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
