import type { Category } from "@/generated/prisma/enums";

import {
	orderedGallery,
	type AdminProduct,
	type AdminProductImage,
} from "../domain/product";
import { ADMIN_PRODUCTS } from "../fixtures/products";

export type AdminProductRow = {
	slug: string;
	name: string;
	description: string | null;
	category: Category;
	published: boolean;
	featured: boolean;
	createdAt: Date;
	gallery: readonly AdminProductImage[];
	variants: readonly {
		sku: string;
		storage: string | null;
		color: string | null;
		price: number;
		stock: number;
	}[];
};

export function toAdminProduct(row: AdminProductRow): AdminProduct {
	return {
		slug: row.slug,
		name: row.name,
		description: row.description,
		category: row.category,
		gallery: orderedGallery(row.gallery),
		published: row.published,
		destacado: row.featured,
		createdAt: row.createdAt.toISOString(),
		variants: row.variants.map((variant) => ({
			sku: variant.sku,
			label: variant.storage,
			priceCents: variant.price,
			stock: variant.stock,
		})),
	};
}

export async function listAdminProducts(): Promise<readonly AdminProduct[]> {
	return ADMIN_PRODUCTS;
}

export async function findAdminProduct(slug: string): Promise<AdminProduct | null> {
	return ADMIN_PRODUCTS.find((product) => product.slug === slug) ?? null;
}
