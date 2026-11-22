import { afterEach, describe, expect, it, vi } from "vitest";

import { createOrder, type Order } from "../domain/order";
import { FIXTURE_ORDERS } from "../fixtures/orders";
import { ORDER_STORAGE_KEY, serializeOrders } from "./order-storage";

async function loadStore() {
	vi.resetModules();

	return import("./order-store");
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

const line = {
	variantId: "v-ipad-256",
	sku: "apple-ipad-11-a16-chip-wi-fi-256gb",
	productSlug: "apple-ipad-11-a16-chip-wi-fi",
	productName: 'Apple iPad 11" A16 Chip WI-FI',
	familyLabel: "iPad",
	variantLabel: "Capacidad 256 GB",
	imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
	imageAlt: "Apple iPad 11 pulgadas A16 en azul, de frente",
	unitPriceCents: 103_500_000,
	quantity: 1,
	available: true,
};

const order: Order = createOrder({
	cartLines: [line],
	buyer: {
		name: "Sofía Ramos",
		email: "sofia.ramos@example.com",
		phone: "11 5555 0100",
		address: "Av. Córdoba 1875, 4.º B",
		city: "CABA",
		postalCode: "1120",
	},
	payment: "transfer",
	number: "IT-2026-0099",
	createdAt: "2026-11-22T01:42:42.000Z",
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("the orders as an external store", () => {
	it("reads the stored orders as the client snapshot", async () => {
		fakeWindow({ [ORDER_STORAGE_KEY]: serializeOrders([order]) });
		const store = await loadStore();

		expect(store.getOrdersSnapshot()).toEqual([order]);
	});

	it("returns the same reference while the stored value did not change", async () => {
		fakeWindow({ [ORDER_STORAGE_KEY]: serializeOrders([order]) });
		const store = await loadStore();

		expect(store.getOrdersSnapshot()).toBe(store.getOrdersSnapshot());
	});

	it("serves the fixture set on the server, where there is no storage", async () => {
		vi.stubGlobal("window", undefined);
		const store = await loadStore();

		expect(store.getOrdersServerSnapshot()).toEqual(FIXTURE_ORDERS);
		expect(store.getOrdersSnapshot()).toEqual(FIXTURE_ORDERS);
	});

	it("persists a write and wakes every subscriber", async () => {
		const { localStorage } = fakeWindow();
		const store = await loadStore();
		const first = vi.fn();
		const second = vi.fn();

		store.subscribeOrders(first);
		store.subscribeOrders(second);
		store.commitOrders([order]);

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
		expect(JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) ?? "null")).toEqual({
			version: 1,
			orders: [order],
		});
		expect(store.getOrdersSnapshot()).toEqual([order]);
	});

	it("keeps the orders in memory when the storage refuses the write", async () => {
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

		expect(() => store.commitOrders([order])).not.toThrow();
		expect(store.getOrdersSnapshot()).toEqual([order]);
	});

	it("stops notifying an unsubscribed listener", async () => {
		fakeWindow();
		const store = await loadStore();
		const listener = vi.fn();
		const unsubscribe = store.subscribeOrders(listener);

		unsubscribe();
		store.commitOrders([order]);

		expect(listener).not.toHaveBeenCalled();
	});
});
