import type { Category } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { FAMILY_ORDER, type CatalogCard } from "../domain/catalog";

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

function familyFilter(family: Category | null) {
	return family === null ? {} : { category: family };
}

export async function countProducts(family: Category | null): Promise<number> {
	return prisma.product.count({ where: familyFilter(family) });
}

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
