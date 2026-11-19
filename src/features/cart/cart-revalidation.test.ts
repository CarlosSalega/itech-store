import { describe, expect, it } from "vitest";

import { cartTotals, type Cart, type CartLine } from "./cart";
import { applyRevalidation, type CatalogVariant } from "./cart-revalidation";

function line(overrides: Partial<CartLine> = {}): CartLine {
	return {
		variantId: "v-ipad",
		sku: "OLD-SKU",
		productSlug: "old-slug",
		productName: "Nombre viejo",
		familyLabel: "iPad",
		variantLabel: "Capacidad 128 GB",
		imageUrl: "/old.webp",
		imageAlt: "Vieja",
		unitPriceCents: 1_000,
		quantity: 1,
		available: true,
		...overrides,
	};
}

function cartOf(...lines: CartLine[]): Cart {
	return { lines, lastAddedVariantId: null };
}

function variant(overrides: Partial<CatalogVariant> = {}): CatalogVariant {
	return {
		variantId: "v-ipad",
		sku: "NEW-SKU",
		productSlug: "new-slug",
		productName: "Nombre nuevo",
		familyLabel: "iPad",
		variantLabel: "Capacidad 256 GB",
		imageUrl: "/new.webp",
		imageAlt: "Nueva",
		unitPriceCents: 103_500_000,
		stock: 5,
		...overrides,
	};
}

describe("applyRevalidation", () => {
	it("replaces every snapshot field with the catalogue's current data", () => {
		const [next] = applyRevalidation(cartOf(line()), { variants: [variant()], requested: ["v-ipad"] }).lines;

		expect(next).toEqual({
			variantId: "v-ipad",
			sku: "NEW-SKU",
			productSlug: "new-slug",
			productName: "Nombre nuevo",
			familyLabel: "iPad",
			variantLabel: "Capacidad 256 GB",
			imageUrl: "/new.webp",
			imageAlt: "Nueva",
			unitPriceCents: 103_500_000,
			quantity: 1,
			available: true,
		});
	});

	it("flags a variant the catalogue no longer has, keeping the line", () => {
		const next = applyRevalidation(cartOf(line()), { variants: [], requested: ["v-ipad"] });

		expect(next.lines).toHaveLength(1);
		expect(next.lines[0]?.available).toBe(false);
	});

	it("flags a variant out of stock and leaves it out of the total", () => {
		const next = applyRevalidation(cartOf(line({ quantity: 2 })), {
			variants: [variant({ stock: 0 })],
			requested: ["v-ipad"],
		});

		expect(next.lines[0]?.available).toBe(false);
		expect(cartTotals(next).totalCents).toBe(0);
		expect(cartTotals(next).unitCount).toBe(2);
	});

	it("clamps the quantity to the remaining stock", () => {
		const next = applyRevalidation(cartOf(line({ quantity: 5 })), {
			variants: [variant({ stock: 2 })],
			requested: ["v-ipad"],
		});

		expect(next.lines[0]?.quantity).toBe(2);
		expect(next.lines[0]?.available).toBe(true);
	});

	it("leaves a line the answer did not mention untouched", () => {
		const untouched = line({ variantId: "v-mac", sku: "MAC", unitPriceCents: 2_000_000 });
		const next = applyRevalidation(cartOf(line(), untouched), {
			variants: [variant()],
			requested: ["v-ipad"],
		});

		expect(next.lines[1]).toEqual(untouched);
	});

	it("keeps the recently added marker across a revalidation", () => {
		const next = applyRevalidation(
			{ lines: [line()], lastAddedVariantId: "v-ipad" },
			{ variants: [variant()], requested: ["v-ipad"] },
		);

		expect(next.lastAddedVariantId).toBe("v-ipad");
	});

	it("prices the total from the catalogue, not from the stored snapshot", () => {
		const next = applyRevalidation(
			cartOf(line({ unitPriceCents: 1, quantity: 2 })),
			{ variants: [variant({ unitPriceCents: 103_500_000 })], requested: ["v-ipad"] },
		);

		expect(cartTotals(next).totalCents).toBe(207_000_000);
	});
});
