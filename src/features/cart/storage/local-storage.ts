import {
	EMPTY_CART,
	MAX_LINE_QUANTITY,
	type Cart,
	type CartLine,
} from "../domain/cart";

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
		available: value.available !== false,
	};
}

function acceptsStoredVersion(version: unknown): boolean {
	return version === undefined || version === CART_STORAGE_VERSION;
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

		if (!acceptsStoredVersion(parsed.version)) {
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

export function writeStoredCart(
	storage: WritableStorage | null | undefined,
	cart: Cart,
): boolean {
	if (storage === null || storage === undefined) {
		return false;
	}

	try {
		storage.setItem(CART_STORAGE_KEY, serializeCart(cart));

		return true;
	} catch {
		return false;
	}
}

export function browserStorage(): Storage | null {
	if (typeof window === "undefined") {
		return null;
	}

	return window.localStorage;
}
