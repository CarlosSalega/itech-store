import type { Category } from "@/generated/prisma/enums";

export const LOW_STOCK_THRESHOLD = 2;

export type AdminVariant = {
	sku: string;
	label: string | null;
	priceCents: number;
	stock: number;
};

export type AdminProduct = {
	slug: string;
	name: string;
	category: Category;
	image: string | null;
	published: boolean;
	variants: AdminVariant[];
};

export function lowestStockVariant(product: AdminProduct): AdminVariant | null {
	return product.variants.reduce<AdminVariant | null>((scarcest, variant) => {
		if (scarcest === null || variant.stock < scarcest.stock) {
			return variant;
		}

		return scarcest;
	}, null);
}

export function productPriceFrom(product: AdminProduct): number | null {
	if (product.variants.length === 0) {
		return null;
	}

	return Math.min(...product.variants.map((variant) => variant.priceCents));
}

export function isLowOnStock(
	product: AdminProduct,
	threshold: number = LOW_STOCK_THRESHOLD,
): boolean {
	const scarcest = lowestStockVariant(product);

	return scarcest !== null && scarcest.stock <= threshold;
}
