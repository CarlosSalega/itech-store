import { MAX_LINE_QUANTITY, type Cart, type CartLine } from "../domain/cart";

export type CatalogVariant = {
	variantId: string;
	sku: string;
	productSlug: string;
	productName: string;
	familyLabel: string;
	variantLabel: string | null;
	imageUrl: string | null;
	imageAlt: string;
	unitPriceCents: number;
	stock: number;
};

export type RevalidationResult =
	| {
			ok: true;
			variants: CatalogVariant[];
			requested: string[];
	  }
	| { ok: false };

export function applyRevalidation(
	cart: Cart,
	result: { variants: CatalogVariant[]; requested: string[] },
): Cart {
	const byId = new Map(result.variants.map((variant) => [variant.variantId, variant]));
	const requested = new Set(result.requested);

	return {
		...cart,
		lines: cart.lines.map((line) =>
			requested.has(line.variantId)
				? revalidateLine(line, byId.get(line.variantId))
				: line,
		),
	};
}

function revalidateLine(line: CartLine, variant: CatalogVariant | undefined): CartLine {
	if (variant === undefined) {
		return { ...line, available: false };
	}

	if (variant.stock <= 0) {
		return {
			...line,
			sku: variant.sku,
			productSlug: variant.productSlug,
			productName: variant.productName,
			familyLabel: variant.familyLabel,
			variantLabel: variant.variantLabel,
			imageUrl: variant.imageUrl,
			imageAlt: variant.imageAlt,
			unitPriceCents: variant.unitPriceCents,
			available: false,
		};
	}

	return {
		variantId: variant.variantId,
		sku: variant.sku,
		productSlug: variant.productSlug,
		productName: variant.productName,
		familyLabel: variant.familyLabel,
		variantLabel: variant.variantLabel,
		imageUrl: variant.imageUrl,
		imageAlt: variant.imageAlt,
		unitPriceCents: variant.unitPriceCents,
		quantity: Math.min(line.quantity, MAX_LINE_QUANTITY, variant.stock),
		available: true,
	};
}
