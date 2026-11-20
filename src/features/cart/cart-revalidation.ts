import { MAX_LINE_QUANTITY, type Cart, type CartLine } from "./cart";

/**
 * Stored prices are a snapshot, never the truth: opening the cart revalidates
 * every line against the catalogue (§S9). This module holds the rules, without
 * React and without the database, so the panel's behaviour is testable.
 */

/** One variant as the catalogue currently describes it. */
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
			/** The ids the query actually asked for: the rest are not news. */
			requested: string[];
	  }
	| { ok: false };

/**
 * Replaces each line's snapshot with the catalogue's current data.
 *
 * - A requested variant that no longer exists, or whose stock is zero, is
 *   flagged `available: false`: the line stays visible (the visitor must be able
 *   to remove it) but leaves the total.
 * - A quantity above the remaining stock is clamped, because a cart cannot hold
 *   units that do not exist.
 * - A line the query never asked about keeps its snapshot and its availability:
 *   an answer only speaks about what it was asked, and a bounded query may leave
 *   lines out.
 */
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
