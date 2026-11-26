import { beforeEach, describe, expect, it, vi } from "vitest";

import { addCartLine, readCart, removeCartLine, updateCartLine } from "./actions";

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
	getAuth: () => ({ api: { getSession: mocks.getSession } }),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const db = vi.hoisted(() => ({
	variants: [] as VariantRow[],
	cartItems: [] as { id: string; userId: string; variantId: string; quantity: number }[],
}));

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

vi.mock("@/lib/prisma", () => ({
	prisma: {
		variant: {
			findUnique: async ({ where }: { where: { id: string } }) =>
				db.variants.find((variant) => variant.id === where.id) ?? null,
		},
		cartItem: {
			findMany: async ({ where }: { where: { userId: string } }) =>
				db.cartItems
					.filter((row) => row.userId === where.userId)
					.map((row) => ({
						...row,
						variant: db.variants.find((variant) => variant.id === row.variantId),
					}))
					.filter((row) => row.variant !== undefined),
			create: async ({ data }: { data: Omit<{ id: string; userId: string; variantId: string; quantity: number }, "id"> }) => {
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
			deleteMany: async ({ where }: { where: { userId: string; variantId: string } }) => {
				db.cartItems = db.cartItems.filter(
					(row) => !(row.userId === where.userId && row.variantId === where.variantId),
				);
			},
			updateMany: async ({
				where,
				data,
			}: {
				where: { userId: string; variantId: string };
				data: { quantity: number };
			}) => {
				for (const row of db.cartItems) {
					if (row.userId === where.userId && row.variantId === where.variantId) {
						row.quantity = data.quantity;
					}
				}
			},
		},
	},
}));

beforeEach(() => {
	mocks.getSession.mockReset();
	db.variants = [
		{
			id: "v-ipad-256",
			sku: "IPAD-A16-256",
			storage: "256 GB",
			color: null,
			price: 103_500_000,
			stock: 5,
			product: {
				slug: "apple-ipad-11-a16-chip-wi-fi",
				name: "Apple iPad 11&quot; A16 Chip WI-FI",
				category: "IPAD",
				gallery: [{ position: 0, url: "/products/ipad/1.webp", alt: "iPad" }],
			},
		},
	];
	db.cartItems = [
		{ id: "ci-1", userId: "u-1", variantId: "v-ipad-256", quantity: 2 },
	];
});

describe("the signed-in cart actions", () => {
	it("refuse a call without a session", async () => {
		mocks.getSession.mockResolvedValueOnce(null);
		mocks.getSession.mockResolvedValueOnce(null);
		mocks.getSession.mockResolvedValueOnce(null);
		mocks.getSession.mockResolvedValueOnce(null);

		expect(await readCart()).toEqual({ ok: false });
		expect(await addCartLine("v-ipad-256", 1)).toEqual({ ok: false });
		expect(await updateCartLine("v-ipad-256", 3)).toEqual({ ok: false });
		expect(await removeCartLine("v-ipad-256")).toEqual({ ok: false });
		expect(db.cartItems).toEqual([
			{ id: "ci-1", userId: "u-1", variantId: "v-ipad-256", quantity: 2 },
		]);
	});

	it("read the cart of the signed-in user only", async () => {
		mocks.getSession.mockResolvedValueOnce({ user: { id: "u-1" } });
		mocks.getSession.mockResolvedValueOnce({ user: { id: "u-2" } });

		const mine = await readCart();
		const theirs = await readCart();

		expect(mine.ok).toBe(true);
		expect(theirs.ok).toBe(true);

		if (mine.ok) {
			expect(mine.lines.map((line) => line.variantId)).toEqual(["v-ipad-256"]);
		}

		if (theirs.ok) {
			expect(theirs.lines).toEqual([]);
		}
	});

	it("refuse to add a variant that does not exist or has no stock", async () => {
		mocks.getSession.mockResolvedValue({ user: { id: "u-1" } });

		expect(await addCartLine("v-gone", 1)).toEqual({ ok: false });
		expect(await addCartLine("v-ipad-256", 1)).not.toEqual({ ok: false });

		db.variants = [{ id: "v-empty", stock: 0, sku: "", storage: null, color: null, price: 0, product: { slug: "", name: "", category: "IPAD", gallery: [] } }];

		expect(await addCartLine("v-empty", 1)).toEqual({ ok: false });
	});

	it("clamp the quantity by stock when updating a line", async () => {
		mocks.getSession.mockResolvedValue({ user: { id: "u-1" } });

		const result = await updateCartLine("v-ipad-256", 50);

		expect(result.ok).toBe(true);

		if (result.ok) {
			const line = result.lines.find((entry) => entry.variantId === "v-ipad-256");

			expect(line?.quantity).toBe(5);
			expect(result.cappedVariantIds).toEqual(["v-ipad-256"]);
		}
	});

	it("remove a line and drop a line whose variant is gone", async () => {
		mocks.getSession.mockResolvedValue({ user: { id: "u-1" } });

		await removeCartLine("v-ipad-256");

		expect(db.cartItems).toEqual([]);
	});
});
