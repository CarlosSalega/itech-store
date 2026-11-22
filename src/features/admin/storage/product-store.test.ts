import { afterEach, describe, expect, it, vi } from "vitest";

import { createProduct } from "../domain/product";
import { ADMIN_PRODUCTS } from "../fixtures/products";
import { ADMIN_PRODUCT_STORAGE_KEY, serializeProducts } from "./product-storage";

async function loadStore() {
	vi.resetModules();

	return import("./product-store");
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

const created = createProduct({
	name: 'Apple iPad Pro 11" M5 Space Black',
	description: null,
	category: "IPAD",
	published: true,
	destacado: true,
	createdAt: "2026-11-20T12:00:00.000Z",
	variants: [{ label: "128 GB", priceCents: 120_000_000, stock: 6 }],
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("the catalogue as an external store", () => {
	it("reads the stored products as the client snapshot", async () => {
		fakeWindow({ [ADMIN_PRODUCT_STORAGE_KEY]: serializeProducts([created]) });
		const store = await loadStore();

		expect(store.getProductsSnapshot()).toEqual([created]);
	});

	it("returns the same reference while the stored value did not change", async () => {
		fakeWindow({ [ADMIN_PRODUCT_STORAGE_KEY]: serializeProducts([created]) });
		const store = await loadStore();

		expect(store.getProductsSnapshot()).toBe(store.getProductsSnapshot());
	});

	it("serves the fixture set on the server, where there is no storage", async () => {
		vi.stubGlobal("window", undefined);
		const store = await loadStore();

		expect(store.getProductsServerSnapshot()).toEqual(ADMIN_PRODUCTS);
		expect(store.getProductsSnapshot()).toEqual(ADMIN_PRODUCTS);
	});

	it("persists a write and wakes every subscriber", async () => {
		const { localStorage } = fakeWindow();
		const store = await loadStore();
		const first = vi.fn();
		const second = vi.fn();

		store.subscribeProducts(first);
		store.subscribeProducts(second);
		store.commitProducts([created]);

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
		expect(JSON.parse(localStorage.getItem(ADMIN_PRODUCT_STORAGE_KEY) ?? "null")).toEqual({
			version: 1,
			products: [created],
		});
		expect(store.getProductsSnapshot()).toEqual([created]);
	});

	it("keeps the catalogue in memory when the storage refuses the write", async () => {
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

		expect(() => store.commitProducts([created])).not.toThrow();
		expect(store.getProductsSnapshot()).toEqual([created]);
	});

	it("stops notifying an unsubscribed listener", async () => {
		fakeWindow();
		const store = await loadStore();
		const listener = vi.fn();
		const unsubscribe = store.subscribeProducts(listener);

		unsubscribe();
		store.commitProducts([created]);

		expect(listener).not.toHaveBeenCalled();
	});
});
