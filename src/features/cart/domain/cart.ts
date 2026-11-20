export const MAX_LINE_QUANTITY = 10;

export type CartLine = {
	variantId: string;
	sku: string;
	productSlug: string;
	productName: string;
	familyLabel: string;
	variantLabel: string | null;
	imageUrl: string | null;
	imageAlt: string;
	unitPriceCents: number;
	quantity: number;
	available: boolean;
};

export type Cart = {
	lines: CartLine[];
	lastAddedVariantId: string | null;
};

export type CartTotals = {
	lineCount: number;
	unitCount: number;
	totalCents: number;
};

export const EMPTY_CART: Cart = { lines: [], lastAddedVariantId: null };

function clampQuantity(quantity: number): number {
	if (!Number.isFinite(quantity)) {
		return 1;
	}

	return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

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

export function cartCountLabel(totals: CartTotals): string {
	const products = totals.lineCount === 1 ? "1 producto" : `${totals.lineCount} productos`;
	const units = totals.unitCount === 1 ? "1 unidad" : `${totals.unitCount} unidades`;

	return `${products} · ${units}`;
}

export function lineContextLabel(line: CartLine): string {
	return `${line.familyLabel} · cantidad ${line.quantity}`;
}

export function variantLabelOf(line: CartLine): string {
	return line.variantLabel ?? line.familyLabel;
}
