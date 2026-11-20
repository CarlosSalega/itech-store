import { afterEach, describe, expect, it, vi } from "vitest";

import { EMPTY_CART, type Cart } from "./cart";
import { CART_STORAGE_KEY, serializeCart } from "./cart-storage";

/**
 * The store is module state plus `window.localStorage`, so each test re-imports
 * a fresh copy: a cached snapshot from the previous test would hide the bug.
 */
async function loadStore() {
	vi.resetModules();

	return import("./cart-store");
}

function fakeWindow(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));

	const localStorage = {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		},
	};

	vi.stubGlobal("window", { localStorage });

	return { data, localStorage };
}

const cart: Cart = {
	lines: [
		{
			variantId: "v-1",
			sku: "SKU-1",
			productSlug: "slug",
			productName: "Producto",
			familyLabel: "iPad",
			variantLabel: "Capacidad 256 GB",
			imageUrl: null,
			imageAlt: "Producto",
			unitPriceCents: 100_000,
			quantity: 2,
			available: true,
		},
	],
	lastAddedVariantId: "v-1",
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("the cart as an external store", () => {
	it("reads the stored cart as the client snapshot", async () => {
		fakeWindow({ [CART_STORAGE_KEY]: serializeCart(cart) });
		const store = await loadStore();

		expect(store.getCartSnapshot()).toEqual(cart);
	});

	it("returns the same reference while the stored value did not change", async () => {
		fakeWindow({ [CART_STORAGE_KEY]: serializeCart(cart) });
		const store = await loadStore();

		expect(store.getCartSnapshot()).toBe(store.getCartSnapshot());
	});

	it("serves the empty cart on the server, where there is no storage", async () => {
		vi.stubGlobal("window", undefined);
		const store = await loadStore();

		expect(store.getCartServerSnapshot()).toEqual(EMPTY_CART);
		expect(store.getCartSnapshot()).toEqual(EMPTY_CART);
	});

	it("persists a write and wakes every subscriber", async () => {
		const { localStorage } = fakeWindow();
		const store = await loadStore();
		const first = vi.fn();
		const second = vi.fn();

		store.subscribeCart(first);
		store.subscribeCart(second);
		store.commitCart(cart);

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
		expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "null")).toEqual({
			version: 1,
			lines: cart.lines,
			lastAddedVariantId: "v-1",
		});
		expect(store.getCartSnapshot()).toEqual(cart);
	});

	it("keeps the cart in memory when the storage refuses the write", async () => {
		fakeWindow();
		const store = await loadStore();

		vi.stubGlobal("window", {
			localStorage: {
				getItem: () => null,
				setItem: () => {
					throw new Error("QuotaExceededError");
				},
			},
		});

		expect(() => store.commitCart(cart)).not.toThrow();
		expect(store.getCartSnapshot()).toEqual(cart);
	});

	it("stops notifying an unsubscribed listener", async () => {
		fakeWindow();
		const store = await loadStore();
		const listener = vi.fn();
		const unsubscribe = store.subscribeCart(listener);

		unsubscribe();
		store.commitCart(cart);

		expect(listener).not.toHaveBeenCalled();
	});
});
