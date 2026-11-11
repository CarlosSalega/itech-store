import { describe, expect, it } from "vitest";

import { resolveVariant, splitPrice } from "./variant-selection";

import type { VariantOption } from "./variant-selector";

const variants: VariantOption[] = [
	{ id: "a", sku: "ipad-128gb", label: "128GB", price: 90_000_000, stock: 5 },
	{ id: "b", sku: "ipad-256gb", label: "256GB", price: 103_500_000, stock: 7 },
];

describe("resolveVariant", () => {
	it("returns the variant matching the selected id", () => {
		expect(resolveVariant(variants, "b")?.sku).toBe("ipad-256gb");
	});

	it("falls back to the first variant when the id is unknown", () => {
		expect(resolveVariant(variants, "does-not-exist")?.sku).toBe("ipad-128gb");
	});

	it("returns undefined when the product has no variants", () => {
		expect(resolveVariant([], "a")).toBeUndefined();
	});
});

describe("splitPrice", () => {
	it("separates the currency sign from the amount", () => {
		expect(splitPrice("$ 900.000")).toEqual({ currency: "$", amount: "900.000" });
	});
});
