import { beforeEach, describe, expect, it, vi } from "vitest";

import { mergeGuestCartForUser, readServerCart, writeCartLines } from "./cart-items";

type VariantRow = {
	id: string;
	sku: string;
	storage: string | null;
	color: string | null;
	price: number;
	stock: number;
	product: {
		slug: string;
		name: string;
		category: "IPHONE" | "MAC" | "IPAD" | "WATCH" | "AIRPODS" | "ACCESSORY";
		gallery: { position: number; url: string; alt: string }[];
	};
};

type CartItemRecord = { id: string; userId: string; variantId: string; quantity: number };

const db = vi.hoisted(() => ({
	cartItems: [] as CartItemRecord[],
	variants: [] as VariantRow[],
}));

vi.mock("@/lib/prisma", () => ({
	prisma: {
		cartItem: {
			findMany: async () =>
				db.cartItems.map((row) => ({
					...row,
					variant: db.variants.find((variant) => variant.id === row.variantId),
				})),
			create: async ({ data }: { data: Omit<CartItemRecord, "id"> }) => {
				db.cartItems.push({ ...data, id: `ci-${db.cartItems.length + 1}` });
			},
			update: async ({ where, data }: { where: { id: string }; data: { quantity: number } }) => {
				const row = db.cartItems.find((entry) => entry.id === where.id);

				if (row) {
					row.quantity = data.quantity;
				}
			},
			delete: async ({ where }: { where: { id: string } }) => {
				db.cartItems = db.cartItems.filter((entry) => entry.id !== where.id);
			},
		},
		variant: {
			findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
				db.variants.filter((variant) => where.id.in.includes(variant.id)),
		},
	},
}));

const IPAD: VariantRow = {
	id: "v-ipad-256",
	sku: "IPAD-A16-256",
	storage: "256 GB",
	color: null,
	price: 103_500_000,
	stock: 10,
	product: {
		slug: "apple-ipad-11-a16-chip-wi-fi",
		name: "Apple iPad 11&quot; A16 Chip WI-FI",
		category: "IPAD",
		gallery: [{ position: 0, url: "/products/ipad/1.webp", alt: "iPad" }],
	},
};

function seedVariant(overrides: Partial<VariantRow> = {}): VariantRow {
	return { ...IPAD, ...overrides };
}

function seedCartItem(variantId: string, quantity: number): CartItemRecord {
	const row = { id: `ci-${db.cartItems.length + 1}`, userId: "u-1", variantId, quantity };
	db.cartItems.push(row);

	return row;
}

beforeEach(() => {
	db.cartItems = [];
	db.variants = [IPAD];
});

describe("readServerCart", () => {
	it("maps the rows to cart lines with the catalogue's snapshot", async () => {
		seedCartItem("v-ipad-256", 2);

		const cart = await readServerCart("u-1");

		expect(cart.lines).toEqual([
			{
				variantId: "v-ipad-256",
				sku: "IPAD-A16-256",
				productSlug: "apple-ipad-11-a16-chip-wi-fi",
				productName: "Apple iPad 11&quot; A16 Chip WI-FI",
				familyLabel: "iPad",
				variantLabel: "256 GB",
				imageUrl: "/products/ipad/1.webp",
				imageAlt: "Apple iPad 11&quot; A16 Chip WI-FI, 256 GB",
				unitPriceCents: 103_500_000,
				quantity: 2,
				available: true,
			},
		]);
		expect(cart.cappedVariantIds).toEqual([]);
	});

	it("marks an out-of-stock variant as unavailable", async () => {
		db.variants = [seedVariant({ stock: 0 })];
		seedCartItem("v-ipad-256", 1);

		const cart = await readServerCart("u-1");

		expect(cart.lines[0]?.available).toBe(false);
	});

	it("marks a line sitting at its cap as capped", async () => {
		db.variants = [seedVariant({ stock: 4 })];
		seedCartItem("v-ipad-256", 4);

		const cart = await readServerCart("u-1");

		expect(cart.cappedVariantIds).toEqual(["v-ipad-256"]);
	});
});

describe("writeCartLines", () => {
	it("creates what is missing, updates what changed and deletes what the cart dropped", async () => {
		seedCartItem("v-ipad-256", 5);
		seedCartItem("v-gone", 1);

		await writeCartLines("u-1", [
			{
				variantId: "v-ipad-256",
				sku: "IPAD-A16-256",
				productSlug: "p",
				productName: "p",
				familyLabel: "iPad",
				variantLabel: null,
				imageUrl: null,
				imageAlt: "alt",
				unitPriceCents: 1,
				quantity: 2,
				available: true,
			},
		]);

		expect(db.cartItems).toEqual([
			{ id: "ci-1", userId: "u-1", variantId: "v-ipad-256", quantity: 2 },
		]);
	});

	it("writes nothing when the rows already match", async () => {
		seedCartItem("v-ipad-256", 3);

		await writeCartLines("u-1", [
			{
				variantId: "v-ipad-256",
				sku: "s",
				productSlug: "p",
				productName: "p",
				familyLabel: "iPad",
				variantLabel: null,
				imageUrl: null,
				imageAlt: "alt",
				unitPriceCents: 1,
				quantity: 3,
				available: true,
			},
		]);

		expect(db.cartItems).toEqual([
			{ id: "ci-1", userId: "u-1", variantId: "v-ipad-256", quantity: 3 },
		]);
	});
});

describe("mergeGuestCartForUser", () => {
	it("sums the same variant clamped by stock, creates what the account lacks and drops a gone variant", async () => {
		seedCartItem("v-ipad-256", 8);
		db.variants = [
			IPAD,
			seedVariant({ id: "v-mac-512", sku: "MAC-A16-512", stock: 2 }),
		];

		await mergeGuestCartForUser("u-1", [
			{
				variantId: "v-ipad-256",
				sku: "IPAD-A16-256",
				productSlug: "p",
				productName: "p",
				familyLabel: "iPad",
				variantLabel: null,
				imageUrl: null,
				imageAlt: "alt",
				unitPriceCents: 1,
				quantity: 5,
				available: true,
			},
			{
				variantId: "v-mac-512",
				sku: "MAC-A16-512",
				productSlug: "p",
				productName: "p",
				familyLabel: "Mac",
				variantLabel: null,
				imageUrl: null,
				imageAlt: "alt",
				unitPriceCents: 1,
				quantity: 9,
				available: true,
			},
			{
				variantId: "v-gone",
				sku: "OLD-1",
				productSlug: "p",
				productName: "p",
				familyLabel: "iPad",
				variantLabel: null,
				imageUrl: null,
				imageAlt: "alt",
				unitPriceCents: 1,
				quantity: 1,
				available: true,
			},
		]);

		expect(db.cartItems).toEqual([
			{ id: "ci-1", userId: "u-1", variantId: "v-ipad-256", quantity: 10 },
			{ id: "ci-2", userId: "u-1", variantId: "v-mac-512", quantity: 2 },
		]);
	});

	it("keeps the account's cart when the guest cart is empty", async () => {
		seedCartItem("v-ipad-256", 3);

		await mergeGuestCartForUser("u-1", []);

		expect(db.cartItems).toEqual([
			{ id: "ci-1", userId: "u-1", variantId: "v-ipad-256", quantity: 3 },
		]);
	});
});
