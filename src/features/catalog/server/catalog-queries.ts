import type { Category } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import { FAMILY_ORDER, type CatalogCard } from "../domain/catalog";

const gallerySelect = {
	orderBy: { position: "asc" },
	select: { url: true, alt: true },
} as const;

const cardSelect = {
	slug: true,
	name: true,
	category: true,
	gallery: gallerySelect,
	variants: { select: { price: true } },
} as const;

type GalleryRow = { url: string; alt: string };

type CardRow = {
	slug: string;
	name: string;
	category: Category;
	gallery: GalleryRow[];
	variants: { price: number }[];
};

export function toCatalogCard(row: CardRow): CatalogCard {
	const [primary] = row.gallery;

	return {
		slug: row.slug,
		name: row.name,
		category: row.category,
		image: primary?.url ?? null,
		imageAlt: primary?.alt ?? null,
		priceFrom:
			row.variants.length === 0
				? null
				: Math.min(...row.variants.map((variant) => variant.price)),
	};
}

function publishedWhere(family: Category | null): {
	published: true;
	category?: Category;
} {
	return family === null ? { published: true } : { published: true, category: family };
}

export async function countProducts(family: Category | null): Promise<number> {
	return prisma.product.count({ where: publishedWhere(family) });
}

export async function listProducts(
	family: Category | null,
	skip: number,
	take: number,
): Promise<CatalogCard[]> {
	const rows = await prisma.product.findMany({
		where: publishedWhere(family),
		select: cardSelect,
		orderBy: { name: "asc" },
		skip,
		take,
	});

	return rows.map(toCatalogCard);
}

export async function listFeaturedProducts(): Promise<CatalogCard[]> {
	const rows = await prisma.product.findMany({
		where: { published: true, featured: true },
		select: cardSelect,
		orderBy: { slug: "asc" },
	});

	return rows.map(toCatalogCard);
}

export async function countByFamily(): Promise<Record<Category, number>> {
	const rows = await prisma.product.groupBy({
		by: ["category"],
		where: { published: true },
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
	gallery: GalleryRow[];
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
	return prisma.product.findFirst({
		where: { slug, published: true },
		select: {
			slug: true,
			name: true,
			description: true,
			category: true,
			gallery: gallerySelect,
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
		where: {
			category: family,
			published: true,
			slug: { not: excludeSlug },
		},
		select: cardSelect,
		orderBy: { name: "asc" },
		take,
	});

	return rows.map(toCatalogCard);
}
