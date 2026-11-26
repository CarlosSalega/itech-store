import type { Category } from "@/generated/prisma/enums";

import {
	orderedGallery,
	type AdminProduct,
	type AdminProductImage,
} from "../domain/product";

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

export const ADMIN_PRODUCT_SELECT = {
	slug: true,
	name: true,
	description: true,
	category: true,
	published: true,
	featured: true,
	createdAt: true,
	gallery: {
		select: { position: true, alt: true, url: true },
		orderBy: { position: "asc" },
	},
	variants: {
		select: { sku: true, storage: true, color: true, price: true, stock: true },
	},
} as const;

export type AdminProductClient = {
	product: {
		findMany(args: {
			select: typeof ADMIN_PRODUCT_SELECT;
			orderBy: { createdAt: "asc" };
		}): Promise<readonly AdminProductRow[]>;
		findUnique(args: {
			where: { slug: string };
			select: typeof ADMIN_PRODUCT_SELECT;
		}): Promise<AdminProductRow | null>;
	};
};

function descriptionOf(row: AdminProductRow): string | null {
	const description = row.description === null ? "" : row.description.trim();

	return description === "" ? null : description;
}

export function toAdminProduct(row: AdminProductRow): AdminProduct {
	return {
		slug: row.slug,
		name: row.name,
		description: descriptionOf(row),
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

let defaultClient: AdminProductClient | undefined;

async function client(): Promise<AdminProductClient> {
	if (defaultClient !== undefined) {
		return defaultClient;
	}

	const { prisma } = await import("@/lib/prisma");

	defaultClient = { product: prisma.product };

	return defaultClient;
}

export async function listAdminProducts(
	source?: AdminProductClient,
): Promise<readonly AdminProduct[]> {
	const rows = await (source ?? (await client())).product.findMany({
		select: ADMIN_PRODUCT_SELECT,
		orderBy: { createdAt: "asc" },
	});

	return rows.map(toAdminProduct);
}

export async function findAdminProduct(
	slug: string,
	source?: AdminProductClient,
): Promise<AdminProduct | null> {
	const row = await (source ?? (await client())).product.findUnique({
		where: { slug },
		select: ADMIN_PRODUCT_SELECT,
	});

	return row === null ? null : toAdminProduct(row);
}
