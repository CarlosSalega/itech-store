import { describe, expect, it } from "vitest";

import { MAX_LINE_QUANTITY, type CartLine } from "./cart";
import { mergeGuestCart } from "./merge-guest-cart";

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

describe("mergeGuestCart", () => {
	it("sums the quantities of the same variant", () => {
		const account = line({ quantity: 2 });
		const guest = line({ quantity: 3 });

		const result = mergeGuestCart([account], [guest], new Map([["v-ipad-256", 10]]));

		expect(result.lines).toEqual([line({ quantity: 5 })]);
		expect(result.clampedVariantIds).toEqual([]);
		expect(result.droppedVariantIds).toEqual([]);
	});

	it("caps the sum at MAX_LINE_QUANTITY and reports the line as clamped", () => {
		const account = line({ quantity: 8 });
		const guest = line({ quantity: 5 });

		const result = mergeGuestCart([account], [guest], new Map([["v-ipad-256", 50]]));

		expect(result.lines).toEqual([line({ quantity: MAX_LINE_QUANTITY })]);
		expect(result.clampedVariantIds).toEqual(["v-ipad-256"]);
	});

	it("caps the sum at the variant's stock and reports the line as clamped", () => {
		const account = line({ quantity: 2 });
		const guest = line({ quantity: 3 });

		const result = mergeGuestCart([account], [guest], new Map([["v-ipad-256", 4]]));

		expect(result.lines).toEqual([line({ quantity: 4 })]);
		expect(result.clampedVariantIds).toEqual(["v-ipad-256"]);
	});

	it("creates a line the account lacks, clamped by stock", () => {
		const guest = line({ variantId: "v-mac-512", sku: "MAC-A16-512", quantity: 3 });

		const result = mergeGuestCart([], [guest], new Map([["v-mac-512", 2]]));

		expect(result.lines).toEqual([line({ variantId: "v-mac-512", sku: "MAC-A16-512", quantity: 2 })]);
		expect(result.clampedVariantIds).toEqual(["v-mac-512"]);
		expect(result.droppedVariantIds).toEqual([]);
	});

	it("drops a guest line whose variant is gone without touching the other lines", () => {
		const account = line({ quantity: 1 });
		const gone = line({ variantId: "v-gone", sku: "OLD-1" });
		const alive = line({ variantId: "v-mac-512", sku: "MAC-A16-512", quantity: 2 });

		const result = mergeGuestCart(
			[account],
			[gone, alive],
			new Map([
				["v-ipad-256", 10],
				["v-mac-512", 10],
			]),
		);

		expect(result.lines).toEqual([
			line({ quantity: 1 }),
			line({ variantId: "v-mac-512", sku: "MAC-A16-512", quantity: 2 }),
		]);
		expect(result.droppedVariantIds).toEqual(["v-gone"]);
	});

	it("keeps the account's lines when the guest cart is empty", () => {
		const account = line({ quantity: 2 });

		const result = mergeGuestCart([account], [], new Map([["v-ipad-256", 10]]));

		expect(result.lines).toEqual([line({ quantity: 2 })]);
		expect(result.clampedVariantIds).toEqual([]);
		expect(result.droppedVariantIds).toEqual([]);
	});

	it("keeps the guest's lines when the account cart is empty", () => {
		const guest = line({ quantity: 2 });

		const result = mergeGuestCart([], [guest], new Map([["v-ipad-256", 10]]));

		expect(result.lines).toEqual([line({ quantity: 2 })]);
		expect(result.clampedVariantIds).toEqual([]);
		expect(result.droppedVariantIds).toEqual([]);
	});

	it("does not grow an already clamped line when the merge runs twice", () => {
		const account = line({ quantity: 8 });
		const guest = line({ quantity: 5 });
		const stock = new Map([["v-ipad-256", 50]]);

		const first = mergeGuestCart([account], [guest], stock);
		const second = mergeGuestCart(first.lines, [guest], stock);

		expect(second.lines).toEqual(first.lines);
		expect(second.clampedVariantIds).toEqual(["v-ipad-256"]);
	});

	it("gives the same result for the same inputs, whatever the order of the lines", () => {
		const account = [line({ quantity: 2 }), line({ variantId: "v-mac-512", sku: "MAC-A16-512", quantity: 1 })];
		const guest = [line({ variantId: "v-mac-512", sku: "MAC-A16-512", quantity: 4 }), line({ quantity: 3 })];
		const stock = new Map([
			["v-ipad-256", 10],
			["v-mac-512", 10],
		]);

		const result = mergeGuestCart(account, guest, stock);

		expect(result.lines).toEqual([
			line({ quantity: 5 }),
			line({ variantId: "v-mac-512", sku: "MAC-A16-512", quantity: 5 }),
		]);
	});
});
