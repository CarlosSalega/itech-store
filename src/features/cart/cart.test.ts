import { describe, expect, it } from "vitest";

import {
	EMPTY_CART,
	MAX_LINE_QUANTITY,
	addLine,
	cartCountLabel,
	cartLineTotal,
	cartTotals,
	clearLastAdded,
	lastAddedLine,
	lineContextLabel,
	removeLine,
	setQuantity,
	variantLabelOf,
	type Cart,
	type CartLine,
} from "./cart";

function line(overrides: Partial<CartLine> = {}): CartLine {
	return {
		variantId: "v-ipad-256",
		sku: "IPAD-A16-256",
		productSlug: "apple-ipad-11-a16-chip-wi-fi",
		productName: "Apple iPad 11&quot; A16 Chip WI-FI",
		familyLabel: "iPad",
		variantLabel: "Capacidad 256 GB",
		imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
		imageAlt: "Apple iPad 11 pulgadas A16 en color azul, de frente",
		unitPriceCents: 103_500_000,
		quantity: 1,
		available: true,
		...overrides,
	};
}

function cartOf(...lines: CartLine[]): Cart {
	return { lines, lastAddedVariantId: lines.at(-1)?.variantId ?? null };
}

describe("addLine", () => {
	it("adds a new variant and marks it as the one just added", () => {
		const next = addLine(EMPTY_CART, line());

		expect(next.lines).toHaveLength(1);
		expect(next.lines[0]?.quantity).toBe(1);
		expect(next.lastAddedVariantId).toBe("v-ipad-256");
	});

	it("increments an existing variant instead of duplicating it, and refreshes its snapshot", () => {
		const first = addLine(EMPTY_CART, line());
		const next = addLine(
			first,
			line({ unitPriceCents: 99_000_000, productName: "Nombre nuevo" }),
		);

		expect(next.lines).toHaveLength(1);
		expect(next.lines[0]?.quantity).toBe(2);
		expect(next.lines[0]?.unitPriceCents).toBe(99_000_000);
		expect(next.lines[0]?.productName).toBe("Nombre nuevo");
	});

	it(`never stores more than ${MAX_LINE_QUANTITY} units of the same variant`, () => {
		let cart = EMPTY_CART;

		for (let index = 0; index < MAX_LINE_QUANTITY + 5; index += 1) {
			cart = addLine(cart, line());
		}

		expect(cart.lines[0]?.quantity).toBe(MAX_LINE_QUANTITY);
	});
});

describe("setQuantity", () => {
	it("clamps to the allowed range instead of reaching zero", () => {
		const cart = cartOf(line());

		expect(setQuantity(cart, "v-ipad-256", 0).lines[0]?.quantity).toBe(1);
		expect(setQuantity(cart, "v-ipad-256", -3).lines[0]?.quantity).toBe(1);
		expect(setQuantity(cart, "v-ipad-256", 3).lines[0]?.quantity).toBe(3);
		expect(setQuantity(cart, "v-ipad-256", MAX_LINE_QUANTITY + 1).lines[0]?.quantity).toBe(
			MAX_LINE_QUANTITY,
		);
	});

	it("ignores an unknown variant", () => {
		const cart = cartOf(line());

		expect(setQuantity(cart, "v-unknown", 4)).toEqual(cart);
	});
});

describe("removeLine and the recently added marker", () => {
	it("drops the line and clears the marker when it pointed at that line", () => {
		const cart = cartOf(line(), line({ variantId: "v-mac", sku: "MAC-M5" }));
		const next = removeLine(cart, "v-mac");

		expect(next.lines.map((entry) => entry.variantId)).toEqual(["v-ipad-256"]);
		expect(next.lastAddedVariantId).toBeNull();
	});

	it("keeps the marker when another line is removed", () => {
		const cart = cartOf(line(), line({ variantId: "v-mac", sku: "MAC-M5" }));

		expect(removeLine(cart, "v-ipad-256").lastAddedVariantId).toBe("v-mac");
	});

	it("clears the marker on its own without touching the lines", () => {
		const cart = cartOf(line());
		const next = clearLastAdded(cart);

		expect(next.lines).toEqual(cart.lines);
		expect(next.lastAddedVariantId).toBeNull();
		expect(lastAddedLine(next)).toBeUndefined();
	});
});

describe("cartTotals", () => {
	it("counts lines, units and the amount of every line", () => {
		const cart = cartOf(
			line({ quantity: 1 }),
			line({ variantId: "v-mac", sku: "MAC-M5", unitPriceCents: 200_000_000, quantity: 1 }),
			line({ variantId: "v-watch", sku: "W-11", unitPriceCents: 60_000_000, quantity: 1 }),
			line({ variantId: "v-homepod", sku: "HP-MINI", unitPriceCents: 3_000_000, quantity: 2 }),
		);

		expect(cartTotals(cart)).toEqual({
			lineCount: 4,
			unitCount: 5,
			totalCents: 103_500_000 + 200_000_000 + 60_000_000 + 6_000_000,
		});
	});

	it("leaves unavailable lines out of the total but keeps them counted", () => {
		const cart = cartOf(
			line({ quantity: 1 }),
			line({ variantId: "v-gone", sku: "GONE", unitPriceCents: 500_000, available: false }),
		);

		expect(cartTotals(cart)).toEqual({
			lineCount: 2,
			unitCount: 2,
			totalCents: 103_500_000,
		});
	});

	it("is an empty total for an empty cart", () => {
		expect(cartTotals(EMPTY_CART)).toEqual({ lineCount: 0, unitCount: 0, totalCents: 0 });
	});
});

describe("money and labels", () => {
	it("multiplies integer cents without floating point drift", () => {
		expect(cartLineTotal(line({ unitPriceCents: 3_000_000, quantity: 2 }))).toBe(6_000_000);
		expect(Number.isInteger(cartLineTotal(line({ unitPriceCents: 103_500_000, quantity: 3 })))).toBe(
			true,
		);
	});

	it("words the panel count in both numbers, with correct singulars", () => {
		expect(cartCountLabel({ lineCount: 4, unitCount: 5, totalCents: 0 })).toBe(
			"4 productos · 5 unidades",
		);
		expect(cartCountLabel({ lineCount: 1, unitCount: 1, totalCents: 0 })).toBe(
			"1 producto · 1 unidad",
		);
		expect(cartCountLabel({ lineCount: 2, unitCount: 1, totalCents: 0 })).toBe(
			"2 productos · 1 unidad",
		);
	});

	it("words the recently added context as family and quantity", () => {
		expect(
			lineContextLabel(line({ familyLabel: "Accesorios", quantity: 2 })),
		).toBe("Accesorios · cantidad 2");
	});

	it("falls back to the family label when the variant has no capacity", () => {
		expect(variantLabelOf(line())).toBe("Capacidad 256 GB");
		expect(variantLabelOf(line({ variantLabel: null, familyLabel: "Mac" }))).toBe("Mac");
	});
});
