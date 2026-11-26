import { describe, expect, it } from "vitest";

import {
	reconcileProductGallery,
	type ProductImageDelegate,
	type ProductImageRow,
} from "./product-gallery";

const PRODUCT_ID = "product_1";

function fakeGallery(rows: readonly ProductImageRow[] = []) {
	const stored = rows.map((row) => ({ ...row }));
	const writes: string[] = [];
	const reads: { productId: string; order: string }[] = [];

	const delegate: ProductImageDelegate = {
		findMany: async (args) => {
			reads.push({
				productId: args.where.productId,
				order: args.orderBy.position,
			});

			return stored.map((row) => ({ ...row }));
		},
		create: async (args) => {
			writes.push(`create:${args.data.position}`);
			stored.push({
				position: args.data.position,
				alt: args.data.alt,
				url: args.data.url,
			});
		},
		update: async (args) => {
			const position = args.where.productId_position.position;

			writes.push(`update:${position}`);

			const hit = stored.find((row) => row.position === position);

			if (hit !== undefined) {
				hit.alt = args.data.alt;
				hit.url = args.data.url;
			}
		},
		deleteMany: async (args) => {
			const positions = [...args.where.position.in];

			writes.push(`delete:${positions.join(",")}`);

			for (const position of positions) {
				const index = stored.findIndex((row) => row.position === position);

				if (index >= 0) {
					stored.splice(index, 1);
				}
			}
		},
	};

	return { delegate, stored, writes, reads };
}

const IMAGE = {
	alt: "Apple iPhone 17 Pro — foto principal",
	url: "/products/iphone/apple-iphone-17-pro-1.webp",
};

describe("the gallery the form saves", () => {
	it("creates the positions the product does not have yet, in position order", async () => {
		const gallery = fakeGallery();

		await reconcileProductGallery(gallery.delegate, PRODUCT_ID, [
			{ position: 1, alt: `${IMAGE.alt} 2`, url: "/products/iphone/2.webp" },
			{ position: 0, ...IMAGE },
		]);

		expect(gallery.writes).toEqual(["create:0", "create:1"]);
		expect(gallery.stored).toEqual([
			{ position: 0, ...IMAGE },
			{ position: 1, alt: `${IMAGE.alt} 2`, url: "/products/iphone/2.webp" },
		]);
		expect(gallery.reads).toEqual([{ productId: PRODUCT_ID, order: "asc" }]);
	});

	it("updates only the rows whose text or address changed", async () => {
		const gallery = fakeGallery([
			{ position: 0, ...IMAGE },
			{ position: 1, alt: `${IMAGE.alt} 2`, url: "/products/iphone/2.webp" },
		]);

		await reconcileProductGallery(gallery.delegate, PRODUCT_ID, [
			{ position: 0, ...IMAGE },
			{
				position: 1,
				alt: "Apple iPhone 17 Pro — foto 2",
				url: "/products/iphone/otra.webp",
			},
		]);

		expect(gallery.writes).toEqual(["update:1"]);
		expect(gallery.stored).toEqual([
			{ position: 0, ...IMAGE },
			{
				position: 1,
				alt: "Apple iPhone 17 Pro — foto 2",
				url: "/products/iphone/otra.webp",
			},
		]);
	});

	it("deletes the rows past the end of the form", async () => {
		const gallery = fakeGallery([
			{ position: 0, ...IMAGE },
			{ position: 1, alt: "dos", url: "/2.webp" },
			{ position: 2, alt: "tres", url: "/3.webp" },
		]);

		await reconcileProductGallery(gallery.delegate, PRODUCT_ID, [{ position: 0, ...IMAGE }]);

		expect(gallery.writes).toEqual(["delete:1,2"]);
		expect(gallery.stored).toEqual([{ position: 0, ...IMAGE }]);
	});

	it("deletes every row when the form carries no photo", async () => {
		const gallery = fakeGallery([
			{ position: 0, ...IMAGE },
			{ position: 1, alt: "dos", url: "/2.webp" },
		]);

		await reconcileProductGallery(gallery.delegate, PRODUCT_ID, []);

		expect(gallery.writes).toEqual(["delete:0,1"]);
		expect(gallery.stored).toEqual([]);
	});

	it("writes nothing when the same gallery is saved twice", async () => {
		const gallery = fakeGallery([{ position: 0, ...IMAGE }]);
		const saved = [
			{ position: 0, ...IMAGE },
			{ position: 1, alt: "dos", url: "/2.webp" },
		];

		await reconcileProductGallery(gallery.delegate, PRODUCT_ID, saved);

		expect(gallery.writes).toEqual(["create:1"]);

		gallery.writes.length = 0;

		await reconcileProductGallery(gallery.delegate, PRODUCT_ID, saved);

		expect(gallery.writes).toEqual([]);
		expect(gallery.stored).toEqual([
			{ position: 0, ...IMAGE },
			{ position: 1, alt: "dos", url: "/2.webp" },
		]);
	});
});
