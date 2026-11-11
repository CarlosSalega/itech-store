import type { Category } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { FAMILY_ORDER, type CatalogCard } from "./catalog";

/**
 * Catalog reads. These are server-only: they are imported by route segments, not
 * by the client components of the catalog.
 *
 * Every read stays request-time. The route defers through `connection()` before
 * calling them, so nothing below runs during `pnpm build`: the cloud database is
 * intermittently unreachable, and a data dependency in the static shell would
 * fail the build for reasons unrelated to this code.
 */

/** The columns a wall card needs. */
const cardSelect = {
	slug: true,
	name: true,
	category: true,
	images: true,
	variants: { select: { price: true } },
} as const;

type CardRow = {
	slug: string;
	name: string;
	category: Category;
	images: string[];
	variants: { price: number }[];
};

/**
 * Reduces a product row to what a card renders: the first image (or none, which
 * makes the card show the placeholder) and the lowest price across its variants.
 */
export function toCatalogCard(row: CardRow): CatalogCard {
	return {
		slug: row.slug,
		name: row.name,
		category: row.category,
		image: row.images[0] ?? null,
		priceFrom:
			row.variants.length === 0
				? null
				: Math.min(...row.variants.map((variant) => variant.price)),
	};
}

/** The where clause of the family filter: `null` means the whole catalog. */
function familyFilter(family: Category | null) {
	return family === null ? {} : { category: family };
}

/** How many products the filter matches, which is what the pager counts. */
export async function countProducts(family: Category | null): Promise<number> {
	return prisma.product.count({ where: familyFilter(family) });
}

/** One page of the wall, ordered by name so the pages never reshuffle. */
export async function listProducts(
	family: Category | null,
	skip: number,
	take: number,
): Promise<CatalogCard[]> {
	const rows = await prisma.product.findMany({
		where: familyFilter(family),
		select: cardSelect,
		orderBy: { name: "asc" },
		skip,
		take,
	});

	return rows.map(toCatalogCard);
}

/**
 * Products per family, including the families with none: `IPHONE` is zero today
 * and the filter states that instead of hiding it.
 */
export async function countByFamily(): Promise<Record<Category, number>> {
	const rows = await prisma.product.groupBy({
		by: ["category"],
		_count: { _all: true },
	});

	const counts = Object.fromEntries(
		FAMILY_ORDER.map((category) => [category, 0]),
	) as Record<Category, number>;

	for (const row of rows) {
		counts[row.category] = row._count._all;
	}

	return counts;
}

export type ProductDetail = {
	slug: string;
	name: string;
	description: string;
	category: Category;
	images: string[];
	variants: {
		id: string;
		sku: string;
		storage: string | null;
		color: string | null;
		price: number;
		stock: number;
	}[];
};

/** One product with its variants, cheapest first so capacities read in order. */
export async function findProductBySlug(
	slug: string,
): Promise<ProductDetail | null> {
	return prisma.product.findUnique({
		where: { slug },
		select: {
			slug: true,
			name: true,
			description: true,
			category: true,
			images: true,
			variants: {
				select: {
					id: true,
					sku: true,
					storage: true,
					color: true,
					price: true,
					stock: true,
				},
				orderBy: { price: "asc" },
			},
		},
	});
}

/** The rest of the same family, so a product page leads back into the catalog. */
export async function listRelatedProducts(
	family: Category,
	excludeSlug: string,
	take: number,
): Promise<CatalogCard[]> {
	const rows = await prisma.product.findMany({
		where: { category: family, slug: { not: excludeSlug } },
		select: cardSelect,
		orderBy: { name: "asc" },
		take,
	});

	return rows.map(toCatalogCard);
}
