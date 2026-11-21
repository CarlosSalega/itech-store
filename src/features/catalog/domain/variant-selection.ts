/**
 * One variant of a product, reduced to what the selector renders. Everything
 * here is serialisable, because it crosses the server/client boundary.
 */
export type VariantOption = {
	id: string;
	sku: string;
	/** Capacity, colour, or a single-presentation label. */
	label: string;
	/** `Capacidad 256 GB`-style capacity, or `null` when the variant has none. */
	variantLabel: string | null;
	/** Integer ARS cents. */
	price: number;
	stock: number;
};

/**
 * The selection rules of the product page, kept out of the component so they can
 * be tested without a DOM: the recommended dependency count for this milestone
 * does not include a React testing stack, and the rules are what can actually
 * break.
 */
export function resolveVariant(
	variants: VariantOption[],
	selectedId: string,
): VariantOption | undefined {
	// An unknown id falls back to the first variant rather than showing nothing:
	// the server already rendered the first variant's price, so hydration can
	// never leave the page with no price at all.
	return variants.find((option) => option.id === selectedId) ?? variants[0];
}

/**
 * `formatArsPrice` owns the whole string ("$ 900.000"); splitting it lets the
 * currency sign take the smaller, muted treatment of the design system.
 */
export function splitPrice(formatted: string): { currency: string; amount: string } {
	const [currency = "", ...amount] = formatted.split(" ");

	return { currency, amount: amount.join(" ") };
}
