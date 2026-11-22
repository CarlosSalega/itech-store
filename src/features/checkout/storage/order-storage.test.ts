import { describe, expect, it } from "vitest";

import { FIXTURE_ORDERS } from "../fixtures/orders";
import {
	ORDER_STORAGE_KEY,
	parseOrders,
	readStoredOrders,
	serializeOrders,
	writeStoredOrders,
} from "./order-storage";

type RawLine = {
	variantId: string;
	sku: string;
	productSlug: string;
	productName: string;
	familyLabel: string;
	variantLabel: string | null;
	imageUrl: string | null;
	imageAlt: string;
	unitPriceCents: number;
	quantity: number;
	available: boolean;
};

function rawLine(overrides: Partial<RawLine> = {}): RawLine {
	return {
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
		...overrides,
	};
}

function rawOrder(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		number: "IT-2026-0009",
		buyer: {
			name: "Sofía Ramos",
			email: "sofia.ramos@example.com",
			phone: "11 5555 0100",
			address: "Av. Córdoba 1875, 4.º B",
			city: "CABA",
			postalCode: "1120",
		},
		delivery: "coordinated",
		payment: "transfer",
		lines: [rawLine()],
		totals: { lineCount: 1, unitCount: 1, totalCents: 103_500_000 },
		status: "confirmed",
		createdAt: "2026-11-22T01:42:42.000Z",
		...overrides,
	};
}

function envelope(orders: unknown, version: unknown = 1): string {
	return JSON.stringify({ version, orders });
}

function numbers(orders: readonly { number: string }[]): string[] {
	return orders.map((order) => order.number);
}

const fixtureNumbers = numbers(FIXTURE_ORDERS);

type FakeStorage = Pick<Storage, "getItem" | "setItem">;

function storageOf(value: string | null): FakeStorage & { written: string[] } {
	const written: string[] = [];

	return {
		written,
		getItem: () => value,
		setItem: (_key: string, next: string) => {
			written.push(next);
		},
	};
}

describe("reading the stored orders", () => {
	it.each([
		["nothing", null],
		["an empty string", "  "],
		["a value that is not JSON", "itech-store"],
		["a bare array", "[]"],
		["a foreign version", envelope([rawOrder()], 7)],
		["an envelope without a version", JSON.stringify({ orders: [rawOrder()] })],
		["an envelope without orders", JSON.stringify({ version: 1 })],
		["an empty list", envelope([])],
		["every entry broken", envelope([rawOrder({ number: "0009" }), null])],
	])("falls back to the fixture set on %s", (_case, raw) => {
		expect(numbers(parseOrders(raw))).toEqual(fixtureNumbers);
	});

	it("keeps the entries it can read and drops the rest", () => {
		const parsed = parseOrders(
			envelope([rawOrder(), rawOrder({ number: "pedido" }), rawOrder({ number: "IT-2026-0010" })]),
		);

		expect(numbers(parsed)).toEqual(["IT-2026-0009", "IT-2026-0010"]);
	});

	it("drops an order whose line lost a required field", () => {
		const brokenLine = rawLine({ productSlug: "" });
		const parsed = parseOrders(
			envelope([rawOrder({ number: "IT-2026-0009", lines: [brokenLine] }), rawOrder()]),
		);

		expect(numbers(parsed)).toEqual(["IT-2026-0009"]);
	});

	it("drops an order with an unknown payment, delivery or status", () => {
		const parsed = parseOrders(
			envelope([
				rawOrder({ number: "IT-2026-0011", payment: "tarjeta" }),
				rawOrder({ number: "IT-2026-0012", delivery: "enviado" }),
				rawOrder({ number: "IT-2026-0013", status: "borrador" }),
				rawOrder({ number: "IT-2026-0014", createdAt: "ayer" }),
			]),
		);

		expect(numbers(parsed)).toEqual(fixtureNumbers);
	});

	it("keeps the first order when the same number appears twice", () => {
		const parsed = parseOrders(
			envelope([
				rawOrder({ number: "IT-2026-0009" }),
				rawOrder({ number: "IT-2026-0009", buyer: { ...(rawOrder().buyer as object) } }),
				rawOrder({ number: "IT-2026-0010" }),
			]),
		);

		expect(numbers(parsed)).toEqual(["IT-2026-0009", "IT-2026-0010"]);
	});

	it("recomputes the totals from the lines instead of trusting them", () => {
		const parsed = parseOrders(
			envelope([
				rawOrder({
					totals: { lineCount: 9, unitCount: 9, totalCents: 1 },
					lines: [rawLine({ quantity: 2, unitPriceCents: 1_000 })],
				}),
			]),
		);

		expect(parsed[0]?.totals).toEqual({
			lineCount: 1,
			unitCount: 2,
			totalCents: 2_000,
		});
	});

	it("reads a written order back with the same shape", () => {
		const order = rawOrder();

		expect(parseOrders(serializeOrders([order as never]))).toEqual([
			{ ...order, totals: { lineCount: 1, unitCount: 1, totalCents: 103_500_000 } },
		]);
	});
});

describe("the versioned key", () => {
	it("writes under one key with its version", () => {
		const storage = storageOf(null);
		const order = FIXTURE_ORDERS[0];

		if (order === undefined) throw new Error("the fixture set is empty");

		expect(writeStoredOrders(storage, [order])).toBe(true);
		expect(storage.written).toHaveLength(1);

		const written: unknown = JSON.parse(storage.written[0] ?? "null");

		expect(written).toMatchObject({ version: 1 });
		expect(Object.keys(written as object)).toEqual(["version", "orders"]);
	});

	it("reads through the key and falls back when the value is foreign", () => {
		expect(numbers(readStoredOrders(storageOf(envelope([rawOrder()]))))).toEqual(["IT-2026-0009"]);
		expect(numbers(readStoredOrders(storageOf("no es json")))).toEqual(fixtureNumbers);
	});

	it("falls back when the storage is missing or refuses to read", () => {
		expect(numbers(readStoredOrders(null))).toEqual(fixtureNumbers);
		expect(
			numbers(
				readStoredOrders({
					getItem: () => {
						throw new Error("SecurityError");
					},
				}),
			),
		).toEqual(fixtureNumbers);
	});

	it("reports a refused write without throwing", () => {
		expect(
			writeStoredOrders(
				{
					setItem: () => {
						throw new Error("QuotaExceededError");
					},
				},
				FIXTURE_ORDERS,
			),
		).toBe(false);
		expect(writeStoredOrders(null, FIXTURE_ORDERS)).toBe(false);
	});

	it("names its own key", () => {
		expect(ORDER_STORAGE_KEY).toBe("itech-store.orders.v1");
	});
});
