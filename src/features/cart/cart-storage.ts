import {
	EMPTY_CART,
	MAX_LINE_QUANTITY,
	type Cart,
	type CartLine,
} from "./cart";

/**
 * The cart's only persistence, for now: `localStorage` behind this module, so the
 * day the cart moves to the database only this file and its callers' wiring
 * change — no component reads storage directly.
 *
 * Everything here is defensive on purpose. Stored data is attacker- and
 * corruption-reachable, a half-written object is common, and losing a cart is a
 * nuisance while taking a page down is a defect: a value that does not parse
 * degrades to the empty cart.
 */

/** Versioned: a future shape change bumps the suffix instead of guessing. */
export const CART_STORAGE_KEY = "itech-store.cart.v1";

const CART_STORAGE_VERSION = 1;

type Envelope = {
	version: number;
	lines: unknown;
	lastAddedVariantId: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

function readCents(value: unknown): number | null {
	return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function readQuantity(value: unknown): number | null {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
		return null;
	}

	return Math.min(MAX_LINE_QUANTITY, value);
}

/** One stored line, or `null` when anything about it is not trustworthy. */
function parseLine(value: unknown): CartLine | null {
	if (!isRecord(value)) {
		return null;
	}

	const variantId = readString(value.variantId);
	const sku = readString(value.sku);
	const productSlug = readString(value.productSlug);
	const productName = readString(value.productName);
	const familyLabel = readString(value.familyLabel);
	const imageAlt = readString(value.imageAlt);
	const unitPriceCents = readCents(value.unitPriceCents);
	const quantity = readQuantity(value.quantity);

	if (
		variantId === null ||
		sku === null ||
		productSlug === null ||
		productName === null ||
		familyLabel === null ||
		imageAlt === null ||
		unitPriceCents === null ||
		quantity === null
	) {
		return null;
	}

	const variantLabel = value.variantLabel === null ? null : readString(value.variantLabel);

	if (value.variantLabel !== null && variantLabel === null) {
		return null;
	}

	const imageUrl = value.imageUrl === null ? null : readString(value.imageUrl);

	if (value.imageUrl !== null && imageUrl === null) {
		return null;
	}

	return {
		variantId,
		sku,
		productSlug,
		productName,
		familyLabel,
		variantLabel,
		imageUrl,
		imageAlt,
		unitPriceCents,
		quantity,
		// Availability is a claim about the database, never about stored data:
		// a restored cart has to be revalidated before it can say it is buyable.
		available: value.available === false ? false : true,
	};
}

function parseEnvelope(raw: string | null): Envelope | null {
	if (typeof raw !== "string" || raw.trim() === "") {
		return null;
	}

	try {
		const parsed: unknown = JSON.parse(raw);

		if (!isRecord(parsed)) {
			return null;
		}

		// The key already carries the version, so a value written without the field
		// is still the shape this module reads. A *different* version is not.
		if (parsed.version !== undefined && parsed.version !== CART_STORAGE_VERSION) {
			return null;
		}

		return {
			version: CART_STORAGE_VERSION,
			lines: parsed.lines,
			lastAddedVariantId: parsed.lastAddedVariantId,
		};
	} catch {
		return null;
	}
}

/**
 * Parses a stored value into a cart that is safe to render. Invalid lines are
 * dropped one by one rather than discarding the whole cart, and duplicated
 * variants collapse into the first line with their units summed.
 */
export function parseCart(raw: string | null): Cart {
	const envelope = parseEnvelope(raw);

	if (envelope === null || !Array.isArray(envelope.lines)) {
		return EMPTY_CART;
	}

	const lines: CartLine[] = [];
	const indexByVariant = new Map<string, number>();

	for (const candidate of envelope.lines) {
		const parsed = parseLine(candidate);

		if (parsed === null) {
			continue;
		}

		const existingIndex = indexByVariant.get(parsed.variantId);

		if (existingIndex === undefined) {
			indexByVariant.set(parsed.variantId, lines.length);
			lines.push(parsed);
			continue;
		}

		const existing = lines[existingIndex];

		if (existing !== undefined) {
			lines[existingIndex] = {
				...existing,
				quantity: Math.min(MAX_LINE_QUANTITY, existing.quantity + parsed.quantity),
			};
		}
	}

	const marker = readString(envelope.lastAddedVariantId);

	return {
		lines,
		lastAddedVariantId:
			marker !== null && lines.some((line) => line.variantId === marker) ? marker : null,
	};
}

export function serializeCart(cart: Cart): string {
	return JSON.stringify({
		version: CART_STORAGE_VERSION,
		lines: cart.lines,
		lastAddedVariantId: cart.lastAddedVariantId,
	});
}

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

/** Reads the stored cart; a storage that throws or is absent yields an empty one. */
export function readStoredCart(storage: ReadableStorage | null | undefined): Cart {
	if (storage === null || storage === undefined) {
		return EMPTY_CART;
	}

	try {
		return parseCart(storage.getItem(CART_STORAGE_KEY));
	} catch {
		return EMPTY_CART;
	}
}

/** Writes the cart; a full or unavailable storage never breaks the page. */
export function writeStoredCart(storage: WritableStorage | null | undefined, cart: Cart): void {
	if (storage === null || storage === undefined) {
		return;
	}

	try {
		storage.setItem(CART_STORAGE_KEY, serializeCart(cart));
	} catch {
		// Quota, private mode, a disabled store: the cart still works in memory.
	}
}

/** The browser's storage, or `null` when the code is not running in a browser. */
export function browserStorage(): Storage | null {
	if (typeof window === "undefined") {
		return null;
	}

	return window.localStorage;
}
