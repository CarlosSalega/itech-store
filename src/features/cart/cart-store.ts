import { EMPTY_CART, type Cart } from "./cart";
import { CART_STORAGE_KEY, parseCart, serializeCart, writeStoredCart } from "./cart-storage";

/**
 * `localStorage` as an external store, read through `useSyncExternalStore`.
 *
 * Why not a `useEffect` that hydrates state: setting state inside an effect is a
 * cascading render the React compiler rejects, and it leaves the first paint
 * ambiguous. React reads `getServerSnapshot` while hydrating and re-reads
 * `getSnapshot` right after, which is exactly the contract a browser-only store
 * needs: the server renders the empty cart, the browser renders what it stored,
 * and no markup ever disagrees.
 *
 * The snapshot is cached by the raw stored string, because `getSnapshot` must
 * return the same reference while nothing changed or React re-renders forever.
 */

let cachedRaw: string | null = null;
let cachedCart: Cart = EMPTY_CART;
/**
 * Once a write is refused, the storage is no longer a mirror of this session and
 * re-reading it would resurrect a cart the visitor already changed.
 */
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

/** Subscribes a component to cart writes. Returns the unsubscribe function. */
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

/**
 * Persists a cart and wakes every subscriber. Storage may refuse the write
 * (quota, private mode); the cart still works for this session, because the
 * in-memory snapshot is what the components read.
 */
export function commitCart(cart: Cart): void {
	storageAuthoritative = writeStoredCart(storage(), cart);
	cachedRaw = serializeCart(cart);
	cachedCart = cart;
	emit();
}
