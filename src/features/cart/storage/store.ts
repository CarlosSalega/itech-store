import { EMPTY_CART, type Cart } from "../domain/cart";
import { CART_STORAGE_KEY, parseCart, serializeCart, writeStoredCart } from "./local-storage";

let cachedRaw: string | null = null;
let cachedCart: Cart = EMPTY_CART;
let storageAuthoritative = true;
const listeners = new Set<() => void>();

function storage(): Storage | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

function readRaw(): string | null {
	const store = storage();

	if (store === null) {
		return null;
	}

	try {
		return store.getItem(CART_STORAGE_KEY);
	} catch {
		return null;
	}
}

export function subscribeCart(listener: () => void): () => void {
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
}

export function getCartSnapshot(): Cart {
	if (!storageAuthoritative) {
		return cachedCart;
	}

	const raw = readRaw();

	if (raw !== cachedRaw) {
		cachedRaw = raw;
		cachedCart = raw === null ? EMPTY_CART : parseCart(raw);
	}

	return cachedCart;
}

export function getCartServerSnapshot(): Cart {
	return EMPTY_CART;
}

function emit(): void {
	for (const listener of listeners) {
		listener();
	}
}

export function commitCart(cart: Cart): void {
	storageAuthoritative = writeStoredCart(storage(), cart);
	cachedRaw = serializeCart(cart);
	cachedCart = cart;
	emit();
}

export function hydrateRemoteCart(cart: Cart): void {
	storageAuthoritative = false;
	cachedRaw = null;
	cachedCart = cart;
	emit();
}

export function commitRemoteCart(cart: Cart): void {
	storageAuthoritative = false;
	cachedRaw = serializeCart(cart);
	cachedCart = cart;
	emit();
}
