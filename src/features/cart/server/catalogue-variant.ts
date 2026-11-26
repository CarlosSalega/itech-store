import type { Category } from "@/generated/prisma/enums";

import { FAMILY_LABEL, formatStorage, variantLabel } from "@/features/catalog/domain/catalog";

import type { CatalogVariant } from "./revalidation";

export const CATALOGUE_VARIANT_SELECT = {
	id: true,
	sku: true,
	storage: true,
	color: true,
	price: true,
	stock: true,
	product: {
		select: {
			slug: true,
			name: true,
			category: true,
			gallery: {
				orderBy: { position: "asc" },
				take: 1,
				select: { url: true },
			},
		},
	},
} as const;

export type CatalogueVariantRow = {
	id: string;
	sku: string;
	storage: string | null;
	color: string | null;
	price: number;
	stock: number;
	product: {
		slug: string;
		name: string;
		category: Category;
		gallery: readonly { url: string }[];
	};
};

export function toCatalogueVariant(row: CatalogueVariantRow): CatalogVariant {
	return {
		variantId: row.id,
		sku: row.sku,
		productSlug: row.product.slug,
		productName: row.product.name,
		familyLabel: FAMILY_LABEL[row.product.category],
		variantLabel: formatStorage(row.storage),
		imageUrl: row.product.gallery[0]?.url ?? null,
		imageAlt: `${row.product.name}, ${variantLabel(row.storage, row.color)}`,
		unitPriceCents: row.price,
		stock: row.stock,
	};
}
