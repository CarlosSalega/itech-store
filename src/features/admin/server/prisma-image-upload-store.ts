import type { PrismaClient } from "@/generated/prisma/client";
import { getPublicIdFromUrl } from "@/modules/image-uploads";
import type { ProductRef } from "@/modules/image-uploads";

import type { ImageUploadStore } from "./image-uploads";

const imageColumns = { id: true, position: true, alt: true, url: true } as const;
const productColumns = { id: true, name: true } as const;

/**
 * A stored url is the provider's `secure_url`, so the key an upload owns is
 * the public id inside it. A url that is not the provider's yields the
 * fallback public id and matches no key.
 */
function listsKey(url: string, key: string): boolean {
	return getPublicIdFromUrl(url) === key;
}

export function createPrismaImageUploadStore(client: PrismaClient): ImageUploadStore {
	return {
		async recordUpload({ key, userId }) {
			await client.imageUpload.upsert({
				where: { key },
				create: { key, userId },
				update: {},
			});
		},

		async forgetUpload(key) {
			await client.imageUpload.deleteMany({ where: { key } });
		},

		async findProduct(productId) {
			return client.product.findUnique({
				where: { id: productId },
				select: productColumns,
			});
		},

		async findProductImage({ productId, url }) {
			return client.productImage.findFirst({
				where: { productId, url },
				select: imageColumns,
			});
		},

		async listGalleryPositions(productId) {
			const rows = await client.productImage.findMany({
				where: { productId },
				select: { position: true },
			});

			return rows.map((row) => row.position);
		},

		async createProductImage({ productId, position, alt, url }) {
			return client.productImage.create({
				data: { productId, position, alt, url },
				select: imageColumns,
			});
		},

		async listProductsByImage(key) {
			const rows = await client.productImage.findMany({
				where: { url: { contains: key } },
				select: { url: true, product: { select: productColumns } },
				orderBy: { position: "asc" },
			});

			const listed = new Map<string, ProductRef>();

			for (const row of rows) {
				if (!listsKey(row.url, key)) continue;

				listed.set(row.product.id, row.product);
			}

			return [...listed.values()];
		},
	};
}
