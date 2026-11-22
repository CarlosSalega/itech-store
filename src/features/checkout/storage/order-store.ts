import type { Order } from "../domain/order";
import { FIXTURE_ORDERS } from "../fixtures/orders";
import { ORDER_STORAGE_KEY, parseOrders, serializeOrders, writeStoredOrders } from "./order-storage";

let cachedRaw: string | null = null;
let cachedOrders: readonly Order[] = FIXTURE_ORDERS;
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
		return store.getItem(ORDER_STORAGE_KEY);
	} catch {
		return null;
	}
}

export function subscribeOrders(listener: () => void): () => void {
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
}

export function getOrdersSnapshot(): readonly Order[] {
	if (!storageAuthoritative) {
		return cachedOrders;
	}

	const raw = readRaw();

	if (raw !== cachedRaw) {
		cachedRaw = raw;
		cachedOrders = parseOrders(raw);
	}

	return cachedOrders;
}

export function getOrdersServerSnapshot(): readonly Order[] {
	return FIXTURE_ORDERS;
}

function emit(): void {
	for (const listener of listeners) {
		listener();
	}
}

export function commitOrders(orders: readonly Order[]): void {
	storageAuthoritative = writeStoredOrders(storage(), orders);
	cachedRaw = serializeOrders(orders);
	cachedOrders = orders;
	emit();
}
