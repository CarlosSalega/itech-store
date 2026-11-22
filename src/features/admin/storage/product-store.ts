import type { AdminProduct } from "../domain/product";
import { ADMIN_PRODUCTS } from "../fixtures/products";
import {
	ADMIN_PRODUCT_STORAGE_KEY,
	parseProducts,
	serializeProducts,
	writeStoredProducts,
} from "./product-storage";

let cachedRaw: string | null = null;
let cachedProducts: readonly AdminProduct[] = ADMIN_PRODUCTS;
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
		return store.getItem(ADMIN_PRODUCT_STORAGE_KEY);
	} catch {
		return null;
	}
}

export function subscribeProducts(listener: () => void): () => void {
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
}

export function getProductsSnapshot(): readonly AdminProduct[] {
	if (!storageAuthoritative) {
		return cachedProducts;
	}

	const raw = readRaw();

	if (raw !== cachedRaw) {
		cachedRaw = raw;
		cachedProducts = parseProducts(raw);
	}

	return cachedProducts;
}

export function getProductsServerSnapshot(): readonly AdminProduct[] {
	return ADMIN_PRODUCTS;
}

function emit(): void {
	for (const listener of listeners) {
		listener();
	}
}

export function commitProducts(products: readonly AdminProduct[]): void {
	storageAuthoritative = writeStoredProducts(storage(), products);
	cachedRaw = serializeProducts(products);
	cachedProducts = products;
	emit();
}
