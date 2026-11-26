import { MAX_LINE_QUANTITY, type CartLine } from "./cart";

function clampedQuantity(quantity: number): number {
	if (!Number.isFinite(quantity)) {
		return 1;
	}

	return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

export type MergedCart = {
	lines: CartLine[];
	/// Variants whose merged quantity topped out: the cart says so on screen,
	/// because a silent clamp is a lie.
	clampedVariantIds: string[];
	/// Guest lines whose variant no longer exists, dropped rather than
	/// blocking the login.
	droppedVariantIds: string[];
};

/**
 * Merges a guest cart into an account's cart line by line: the same variant
 * adds its quantities, clamped by stock and by MAX_LINE_QUANTITY; a guest
 * line the account lacks is created; a guest line whose variant is gone is
 * dropped. Pure: the same inputs give the same result, and an already
 * clamped line does not grow if the merge runs again.
 */
export function mergeGuestCart(
	accountLines: CartLine[],
	guestLines: CartLine[],
	stockByVariantId: ReadonlyMap<string, number>,
): MergedCart {
	const lines = accountLines.map((entry) => ({ ...entry }));
	const clampedVariantIds: string[] = [];
	const droppedVariantIds: string[] = [];

	for (const guestLine of guestLines) {
		const stock = stockByVariantId.get(guestLine.variantId);

		if (stock === undefined) {
			droppedVariantIds.push(guestLine.variantId);
			continue;
		}

		const existing = lines.find((entry) => entry.variantId === guestLine.variantId);
		const cap = Math.min(MAX_LINE_QUANTITY, Math.max(stock, 1));
		const wanted = existing === undefined
			? clampedQuantity(guestLine.quantity)
			: clampedQuantity(existing.quantity) + clampedQuantity(guestLine.quantity);
		const quantity = Math.min(wanted, cap);

		if (existing === undefined) {
			lines.push({ ...guestLine, quantity });
		} else {
			existing.quantity = quantity;
		}

		if (quantity < wanted) {
			clampedVariantIds.push(guestLine.variantId);
		}
	}

	return { lines, clampedVariantIds, droppedVariantIds };
}
