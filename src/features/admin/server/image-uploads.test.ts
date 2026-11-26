import { describe, expect, it } from "vitest";

import { ImageError, isImageError } from "@/modules/image-uploads";
import type { ProductRef } from "@/modules/image-uploads";
import type { DeleteUploadArgs, RecordUploadArgs } from "@/modules/image-uploads/next";

import type { ImageUploadStore } from "./image-uploads";
import { authorizeImageUploadDelete, nextGalleryPosition, recordImageUpload } from "./image-uploads";

const ACTOR = { id: "admin-1", role: "ADMIN" } as const;
const KEY = "products/product-1/foto";
const URL_TEXT = "https://res.cloudinary.com/demo/image/upload/v1/products/product-1/foto.jpg";
const OTHER_URL_TEXT = "https://res.cloudinary.com/demo/image/upload/v1/products/product-2/foto.jpg";

const PHONE: ProductRef = { id: "product-1", name: "iPhone 17" };
const LAPTOP: ProductRef = { id: "product-2", name: "MacBook Air" };

type StoredImage = {
	id: string;
	productId: string;
	position: number;
	alt: string;
	url: string;
};

function fakeStore(
	options: {
		products?: readonly ProductRef[];
		images?: readonly StoredImage[];
	} = {},
) {
	const uploads = new Map<string, string>();
	const products = new Map((options.products ?? []).map((product) => [product.id, product]));
	const images: StoredImage[] = [...(options.images ?? [])];
	let nextId = images.length + 1;

	const store: ImageUploadStore = {
		async recordUpload({ key, userId }) {
			if (!uploads.has(key)) uploads.set(key, userId);
		},

		async forgetUpload(key) {
			uploads.delete(key);
		},

		async findProduct(productId) {
			return products.get(productId) ?? null;
		},

		async findProductImage({ productId, url }) {
			const hit = images.find((image) => image.productId === productId && image.url === url);

			if (hit === undefined) return null;

			return { id: hit.id, position: hit.position, alt: hit.alt, url: hit.url };
		},

		async listGalleryPositions(productId) {
			return images
				.filter((image) => image.productId === productId)
				.map((image) => image.position);
		},

		async createProductImage({ productId, position, alt, url }) {
			const row = { id: `image-${nextId++}`, productId, position, alt, url };

			images.push(row);

			return { id: row.id, position, alt, url };
		},

		async listProductsByImage(key) {
			const listed = new Map<string, ProductRef>();

			for (const image of images) {
				if (!image.url.includes(key)) continue;

				const product = products.get(image.productId);

				if (product !== undefined) listed.set(product.id, product);
			}

			return [...listed.values()];
		},
	};

	return { store, uploads, images };
}

function recordArgs(overrides: Partial<RecordUploadArgs> = {}): RecordUploadArgs {
	return {
		actor: ACTOR,
		key: KEY,
		url: URL_TEXT,
		productId: "product-1",
		alt: null,
		...overrides,
	};
}

function deleteArgs(overrides: Partial<DeleteUploadArgs> = {}): DeleteUploadArgs {
	return { actor: ACTOR, key: KEY, productId: "product-1", ...overrides };
}

describe("the position a new photo takes", () => {
	it("starts at zero on an empty gallery", () => {
		expect(nextGalleryPosition([])).toBe(0);
	});

	it("follows the last photo", () => {
		expect(nextGalleryPosition([0, 1])).toBe(2);
	});

	it("never reuses a position a hole left behind", () => {
		expect(nextGalleryPosition([0, 2])).toBe(3);
	});
});

describe("recording an accepted upload", () => {
	it("writes the asset and the gallery row once when the same key is recorded twice", async () => {
		const { store, uploads, images } = fakeStore({ products: [PHONE] });

		const first = await recordImageUpload(recordArgs(), store);
		const second = await recordImageUpload(recordArgs(), store);

		expect(uploads.size).toBe(1);
		expect(uploads.get(KEY)).toBe(ACTOR.id);
		expect(images).toHaveLength(1);
		expect(second).toEqual(first);
	});

	it("appends the row after the last position with the catalogue's alt", async () => {
		const { store, images } = fakeStore({
			products: [PHONE],
			images: [
				{ id: "image-1", productId: "product-1", position: 0, alt: "iPhone 17 — foto principal", url: "/products/phone-1.webp" },
				{ id: "image-2", productId: "product-1", position: 1, alt: "iPhone 17 — foto 2", url: "/products/phone-2.webp" },
			],
		});

		const recorded = await recordImageUpload(recordArgs(), store);

		expect(recorded).toEqual({
			image: { id: "image-3", position: 2, alt: "iPhone 17 — foto 3", url: URL_TEXT },
		});
		expect(images).toHaveLength(3);
		expect(images[0]?.id).toBe("image-1");
	});

	it("keeps a position a hole left free", async () => {
		const { store } = fakeStore({
			products: [PHONE],
			images: [
				{ id: "image-1", productId: "product-1", position: 0, alt: "iPhone 17 — foto principal", url: "/products/phone-1.webp" },
				{ id: "image-2", productId: "product-1", position: 2, alt: "iPhone 17 — foto 3", url: "/products/phone-2.webp" },
			],
		});

		const recorded = await recordImageUpload(recordArgs(), store);

		expect(recorded.image?.position).toBe(3);
	});

	it("keeps the alt the panel sent", async () => {
		const { store } = fakeStore({ products: [PHONE] });

		const recorded = await recordImageUpload(recordArgs({ alt: "iPhone 17 de frente" }), store);

		expect(recorded.image?.alt).toBe("iPhone 17 de frente");
	});

	it("records an asset with no product without touching a gallery", async () => {
		const { store, uploads, images } = fakeStore({ products: [PHONE] });

		const recorded = await recordImageUpload(recordArgs({ productId: null }), store);

		expect(recorded).toEqual({ image: null });
		expect(uploads.has(KEY)).toBe(true);
		expect(images).toHaveLength(0);
	});

	it("refuses a product that does not exist, after recording the asset", async () => {
		const { store, uploads, images } = fakeStore({ products: [LAPTOP] });

		await expect(recordImageUpload(recordArgs(), store)).rejects.toSatisfy(
			(error: unknown) => isImageError(error) && error.code === "NOT_FOUND",
		);

		expect(uploads.has(KEY)).toBe(true);
		expect(images).toHaveLength(0);
	});

	it("does not reach the gallery when the asset record fails", async () => {
		const { store, images } = fakeStore({ products: [PHONE] });
		const failing: ImageUploadStore = {
			...store,
			async recordUpload() {
				throw new ImageError("UPLOAD_FAILED");
			},
		};

		await expect(recordImageUpload(recordArgs(), failing)).rejects.toBeInstanceOf(ImageError);
		expect(images).toHaveLength(0);
	});
});

describe("deleting a key by its owner", () => {
	it("allows an orphan no product lists", async () => {
		const { store } = fakeStore({ products: [PHONE, LAPTOP] });

		await expect(authorizeImageUploadDelete(deleteArgs(), store)).resolves.toEqual({
			allowed: true,
		});
	});

	it("allows the product that lists the key", async () => {
		const { store } = fakeStore({
			products: [PHONE, LAPTOP],
			images: [{ id: "image-1", productId: "product-2", position: 0, alt: "MacBook Air — foto principal", url: OTHER_URL_TEXT }],
		});

		await expect(
			authorizeImageUploadDelete(deleteArgs({ key: KEY, productId: "product-2" }), store),
		).resolves.toEqual({ allowed: true });
	});

	it("refuses a key another product lists, with the guard's sentence", async () => {
		const { store } = fakeStore({
			products: [PHONE, LAPTOP],
			images: [{ id: "image-1", productId: "product-2", position: 0, alt: "MacBook Air — foto principal", url: OTHER_URL_TEXT }],
		});

		await expect(
			authorizeImageUploadDelete(
				deleteArgs({ key: "products/product-2/foto", productId: "product-1" }),
				store,
			),
		).resolves.toEqual({
			allowed: false,
			reason: "OTHER_PRODUCT",
			message:
				"No tienes permiso para eliminar esta imagen: pertenece al producto «MacBook Air».",
		});
	});

	it("refuses a listed key when the request names no product", async () => {
		const { store } = fakeStore({
			products: [PHONE],
			images: [{ id: "image-1", productId: "product-1", position: 0, alt: "iPhone 17 — foto principal", url: URL_TEXT }],
		});

		await expect(
			authorizeImageUploadDelete(deleteArgs({ productId: null }), store),
		).resolves.toEqual({
			allowed: false,
			reason: "OTHER_PRODUCT",
			message: "No tienes permiso para eliminar esta imagen: pertenece al producto «iPhone 17».",
		});
	});
});
