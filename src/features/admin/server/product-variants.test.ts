import { describe, expect, it } from "vitest";

import {
	reconcileProductVariants,
	type VariantDelegate,
	type VariantRow,
} from "./product-variants";

const PRODUCT_ID = "product_1";

function fakeVariants(rows: readonly VariantRow[] = []) {
	const stored = rows.map((row) => ({ ...row }));
	const writes: string[] = [];

	const delegate: VariantDelegate = {
		findMany: async (args) => {
			expect(args.where.productId).toBe(PRODUCT_ID);

			return stored.map((row) => ({ ...row }));
		},
		create: async (args) => {
			writes.push(`create:${args.data.sku}`);
			stored.push({
				sku: args.data.sku,
				storage: args.data.storage,
				price: args.data.price,
				stock: args.data.stock,
			});
		},
		update: async (args) => {
			writes.push(`update:${args.where.sku}`);

			const hit = stored.find((row) => row.sku === args.where.sku);

			if (hit !== undefined) {
				hit.storage = args.data.storage;
				hit.price = args.data.price;
				hit.stock = args.data.stock;
			}
		},
		deleteMany: async (args) => {
			const skus = [...args.where.sku.in];

			for (const sku of skus) {
				writes.push(`delete:${sku}`);

				const index = stored.findIndex((row) => row.sku === sku);

				if (index >= 0) {
					stored.splice(index, 1);
				}
			}
		},
	};

	return { delegate, stored, writes };
}

describe("the variants the form saves", () => {
	it("creates the variants the product does not have yet", async () => {
		const variants = fakeVariants();

		await reconcileProductVariants(variants.delegate, PRODUCT_ID, [
			{ sku: "iphone-17-pro-256gb", storage: "256 GB", price: 1_500_000, stock: 3 },
			{ sku: "iphone-17-pro-512gb", storage: "512 GB", price: 1_800_000, stock: 1 },
		]);

		expect(variants.writes).toEqual([
			"create:iphone-17-pro-256gb",
			"create:iphone-17-pro-512gb",
		]);
		expect(variants.stored).toEqual([
			{ sku: "iphone-17-pro-256gb", storage: "256 GB", price: 1_500_000, stock: 3 },
			{ sku: "iphone-17-pro-512gb", storage: "512 GB", price: 1_800_000, stock: 1 },
		]);
	});

	it("updates the price and the stock of a variant whose sku stays", async () => {
		const variants = fakeVariants([
			{ sku: "iphone-17-pro-256gb", storage: "256 GB", price: 1_500_000, stock: 3 },
		]);

		await reconcileProductVariants(variants.delegate, PRODUCT_ID, [
			{ sku: "iphone-17-pro-256gb", storage: "256 GB", price: 1_400_000, stock: 0 },
		]);

		expect(variants.writes).toEqual(["update:iphone-17-pro-256gb"]);
		expect(variants.stored).toEqual([
			{ sku: "iphone-17-pro-256gb", storage: "256 GB", price: 1_400_000, stock: 0 },
		]);
	});

	it("deletes the variants the form dropped", async () => {
		const variants = fakeVariants([
			{ sku: "iphone-17-pro-256gb", storage: "256 GB", price: 1_500_000, stock: 3 },
			{ sku: "iphone-17-pro-512gb", storage: "512 GB", price: 1_800_000, stock: 1 },
		]);

		await reconcileProductVariants(variants.delegate, PRODUCT_ID, [
			{ sku: "iphone-17-pro-256gb", storage: "256 GB", price: 1_500_000, stock: 3 },
		]);

		expect(variants.writes).toEqual(["delete:iphone-17-pro-512gb"]);
		expect(variants.stored).toEqual([
			{ sku: "iphone-17-pro-256gb", storage: "256 GB", price: 1_500_000, stock: 3 },
		]);
	});

	it("writes nothing when the same variants are saved twice", async () => {
		const variants = fakeVariants([
			{ sku: "iphone-17-pro-256gb", storage: "256 GB", price: 1_500_000, stock: 3 },
		]);
		const saved = [
			{ sku: "iphone-17-pro-256gb", storage: "256 GB", price: 1_500_000, stock: 3 },
		];

		await reconcileProductVariants(variants.delegate, PRODUCT_ID, saved);
		expect(variants.writes).toEqual([]);

		await reconcileProductVariants(variants.delegate, PRODUCT_ID, saved);
		expect(variants.writes).toEqual([]);
	});
});
