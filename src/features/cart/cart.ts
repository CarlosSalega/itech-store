/**
 * The cart's rules, kept out of React and out of the browser: the same module
 * runs in the panel, in the storage layer and in the tests. Every amount here is
 * an integer number of ARS cents (see `formatArsPrice` for rendering) and every
 * quantity is an integer.
 *
 * A line carries a snapshot of what the catalogue showed when the product was
 * added. The snapshot is never authoritative — `applyRevalidation` replaces it
 * with what the database says when the panel opens (S9) — but it lets the cart
 * render immediately, before any request resolves.
 */

/** A guardrail against a runaway stepper, not a stock rule. */
export const MAX_LINE_QUANTITY = 10;

export type CartLine = {
	variantId: string;
	sku: string;
	productSlug: string;
	productName: string;
	/** The product's family label, used when the variant has no capacity. */
	familyLabel: string;
	/** `Capacidad 256 GB`; `null` when the variant has no capacity at all. */
	variantLabel: string | null;
	imageUrl: string | null;
	imageAlt: string;
	unitPriceCents: number;
	quantity: number;
	/** `false` once revalidation proved the variant cannot be bought. */
	available: boolean;
};

export type Cart = {
	lines: CartLine[];
	/** The line to announce above the list; cleared when the panel closes. */
	lastAddedVariantId: string | null;
};

export type CartTotals = {
	/** Distinct products in the cart. */
	lineCount: number;
	/** Sum of the quantities. */
	unitCount: number;
	/** Only what can actually be bought. */
	totalCents: number;
};

export const EMPTY_CART: Cart = { lines: [], lastAddedVariantId: null };

function clampQuantity(quantity: number): number {
	if (!Number.isFinite(quantity)) {
		return 1;
	}

	return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

/**
 * Adds one unit of a variant. An existing variant is incremented and takes the
 * fresh snapshot, so the newest price the catalogue showed is the one that
 * renders; the line is never duplicated.
 */
export function addLine(cart: Cart, line: CartLine): Cart {
	const existing = cart.lines.find((entry) => entry.variantId === line.variantId);

	if (existing === undefined) {
		const added: CartLine = { ...line, quantity: clampQuantity(line.quantity) };

		return { lines: [...cart.lines, added], lastAddedVariantId: added.variantId };
	}

	const increment = existing.quantity + clampQuantity(line.quantity);

	return {
		lines: cart.lines.map((entry) =>
			entry.variantId === line.variantId
				? { ...line, quantity: clampQuantity(increment) }
				: entry,
		),
		lastAddedVariantId: line.variantId,
	};
}

/**
 * Sets the quantity of one line. The stepper can never reach zero: removing a
 * line is `removeLine`'s job, so going below one clamps to one instead of
 * silently deleting something the visitor did not ask to delete.
 */
export function setQuantity(cart: Cart, variantId: string, quantity: number): Cart {
	if (!cart.lines.some((entry) => entry.variantId === variantId)) {
		return cart;
	}

	return {
		...cart,
		lines: cart.lines.map((entry) =>
			entry.variantId === variantId
				? { ...entry, quantity: clampQuantity(quantity) }
				: entry,
		),
	};
}

export function removeLine(cart: Cart, variantId: string): Cart {
	return {
		lines: cart.lines.filter((entry) => entry.variantId !== variantId),
		// A marker that pointed at a removed line would announce something that is
		// no longer in the cart.
		lastAddedVariantId: cart.lastAddedVariantId === variantId ? null : cart.lastAddedVariantId,
	};
}

export function clearLastAdded(cart: Cart): Cart {
	return cart.lastAddedVariantId === null ? cart : { ...cart, lastAddedVariantId: null };
}

export function lastAddedLine(cart: Cart): CartLine | undefined {
	if (cart.lastAddedVariantId === null) {
		return undefined;
	}

	return cart.lines.find((entry) => entry.variantId === cart.lastAddedVariantId);
}

export function cartLineTotal(line: CartLine): number {
	return line.unitPriceCents * line.quantity;
}

export function cartTotals(cart: Cart): CartTotals {
	return cart.lines.reduce<CartTotals>(
		(totals, line) => ({
			lineCount: totals.lineCount + 1,
			unitCount: totals.unitCount + line.quantity,
			totalCents: totals.totalCents + (line.available ? cartLineTotal(line) : 0),
		}),
		{ lineCount: 0, unitCount: 0, totalCents: 0 },
	);
}

/** `4 productos · 5 unidades`, as the panel header reads it. */
export function cartCountLabel(totals: CartTotals): string {
	const products = totals.lineCount === 1 ? "1 producto" : `${totals.lineCount} productos`;
	const units = totals.unitCount === 1 ? "1 unidad" : `${totals.unitCount} unidades`;

	return `${products} · ${units}`;
}

/** `Accesorios · cantidad 2`, the context line of the recently added block. */
export function lineContextLabel(line: CartLine): string {
	return `${line.familyLabel} · cantidad ${line.quantity}`;
}

/** The capacity when the variant has one, the family otherwise. */
export function variantLabelOf(line: CartLine): string {
	return line.variantLabel ?? line.familyLabel;
}
