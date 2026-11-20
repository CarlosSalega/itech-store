import { describe, expect, it } from "vitest";

import {
	EMPTY_CART,
	MAX_LINE_QUANTITY,
	type Cart,
	type CartLine,
} from "../domain/cart";
import {
	CART_STORAGE_KEY,
	parseCart,
	readStoredCart,
	serializeCart,
	writeStoredCart,
} from "./local-storage";

function line(overrides: Partial<CartLine> = {}): CartLine {
	return {
		variantId: "v-ipad-256",
		sku: "IPAD-A16-256",
		productSlug: "apple-ipad-11-a16-chip-wi-fi",
		productName: 'Apple iPad 11" A16 Chip WI-FI',
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

type FakeStorage = Pick<Storage, "getItem" | "setItem">;

function storageOf(value: string | null): FakeStorage & { written: string[] } {
	const written: string[] = [];

	return {
		written,
		getItem: () => value,
		setItem: (_key: string, next: string) => {
			written.push(next);
		},
	};
}

describe("round trip", () => {
	it("serialises and parses back an identical cart", () => {
		const cart = cartOf(line(), line({ variantId: "v-mac", sku: "MAC-M5", variantLabel: null }));

		expect(parseCart(serializeCart(cart))).toEqual(cart);
	});

	it("writes and reads through the versioned key", () => {
		const storage = storageOf(null);
		const cart = cartOf(line());

		writeStoredCart(storage, cart);

		expect(storage.written).toHaveLength(1);
		expect(CART_STORAGE_KEY).toBe("itech-store.cart.v1");
		expect(parseCart(storage.written[0] ?? null)).toEqual(cart);
	});
});

describe("defensive parsing", () => {
	it("degrades a missing, empty or foreign value to the empty cart", () => {
		expect(parseCart(null)).toEqual(EMPTY_CART);
		expect(parseCart("")).toEqual(EMPTY_CART);
		expect(parseCart("{not json")).toEqual(EMPTY_CART);
		expect(parseCart("[]")).toEqual(EMPTY_CART);
		expect(parseCart('{"lines":"nope"}')).toEqual(EMPTY_CART);
	});

	it("keeps the valid lines and drops the invalid ones", () => {
		const valid = line();
		const raw = JSON.stringify({
			lines: [
				valid,
				{ ...line({ variantId: "v-broken" }), unitPriceCents: "caro" },
				{ ...line({ variantId: "v-float" }), unitPriceCents: 10.5 },
				{ ...line({ variantId: "v-negative" }), unitPriceCents: -1 },
				{ ...line({ variantId: "v-zero" }), quantity: 0 },
				{ ...line({ variantId: "v-float-qty" }), quantity: 1.5 },
				{ ...line({ variantId: "v-noid" }), variantId: "" },
				"not a line",
				null,
			],
			lastAddedVariantId: "v-broken",
		});

		const cart = parseCart(raw);

		expect(cart.lines).toEqual([valid]);
		expect(cart.lastAddedVariantId).toBeNull();
	});

	it("clamps a stored quantity above the allowed maximum", () => {
		const raw = JSON.stringify({
			lines: [line({ quantity: 999 })],
			lastAddedVariantId: "v-ipad-256",
		});

		expect(parseCart(raw).lines[0]?.quantity).toBe(MAX_LINE_QUANTITY);
	});

	it("collapses duplicated variants, keeping the first and summing their units", () => {
		const raw = JSON.stringify({
			lines: [line({ quantity: 2 }), line({ quantity: 3 })],
			lastAddedVariantId: "v-ipad-256",
		});

		const cart = parseCart(raw);

		expect(cart.lines).toHaveLength(1);
		expect(cart.lines[0]?.quantity).toBe(5);
	});

	it("clears the recently added marker when that line was dropped", () => {
		const raw = JSON.stringify({
			lines: [line()],
			lastAddedVariantId: "v-not-stored",
		});

		expect(parseCart(raw).lastAddedVariantId).toBeNull();
	});
});

describe("storage failures", () => {
	it("reads an empty cart when the storage throws or is absent", () => {
		const throwing: FakeStorage = {
			getItem: () => {
				throw new Error("SecurityError");
			},
			setItem: () => {},
		};

		expect(readStoredCart(throwing)).toEqual(EMPTY_CART);
		expect(readStoredCart(null)).toEqual(EMPTY_CART);
	});

	it("reads the stored value when the storage works", () => {
		const cart = cartOf(line());

		expect(readStoredCart(storageOf(serializeCart(cart)))).toEqual(cart);
	});

	it("swallows a write failure instead of breaking the page", () => {
		const throwing: FakeStorage = {
			getItem: () => null,
			setItem: () => {
				throw new Error("QuotaExceededError");
			},
		};

		expect(() => writeStoredCart(throwing, cartOf(line()))).not.toThrow();
	});
});
