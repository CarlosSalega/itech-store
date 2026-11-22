import type { CartLine } from "@/features/cart/domain/cart";
import { cartTotals } from "@/features/cart/domain/cart";
import { parseCart } from "@/features/cart/storage/local-storage";

import {
	BUYER_FIELDS,
	ORDER_NUMBER_PATTERN,
	type Order,
	type OrderBuyer,
	type OrderPayment,
} from "../domain/order";
import { FIXTURE_ORDERS } from "../fixtures/orders";

export const ORDER_STORAGE_KEY = "itech-store.orders.v1";

const ORDER_STORAGE_VERSION = 1;

const PAYMENTS: readonly OrderPayment[] = ["transfer", "cash"];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readBuyer(value: unknown): OrderBuyer | null {
	if (!isRecord(value)) {
		return null;
	}

	const buyer = {} as OrderBuyer;

	for (const field of BUYER_FIELDS) {
		const read = readString(value[field]);

		if (read === null) {
			return null;
		}

		buyer[field] = read.trim();
	}

	return buyer;
}

function readLines(value: unknown): CartLine[] | null {
	if (!Array.isArray(value) || value.length === 0) {
		return null;
	}

	const parsed = parseCart(JSON.stringify({ lines: value, lastAddedVariantId: null })).lines;

	return parsed.length === value.length ? parsed : null;
}

function readPayment(value: unknown): OrderPayment | null {
	return PAYMENTS.find((payment) => payment === value) ?? null;
}

function readCreatedAt(value: unknown): string | null {
	if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
		return null;
	}

	return value;
}

function parseOrder(value: unknown): Order | null {
	if (!isRecord(value)) {
		return null;
	}

	const number = readString(value.number);
	const buyer = readBuyer(value.buyer);
	const payment = readPayment(value.payment);
	const lines = readLines(value.lines);
	const createdAt = readCreatedAt(value.createdAt);

	if (
		number === null ||
		!ORDER_NUMBER_PATTERN.test(number) ||
		buyer === null ||
		payment === null ||
		lines === null ||
		createdAt === null ||
		value.delivery !== "coordinated" ||
		value.status !== "confirmed"
	) {
		return null;
	}

	return {
		number,
		buyer,
		delivery: "coordinated",
		payment,
		lines,
		totals: cartTotals({ lines, lastAddedVariantId: null }),
		status: "confirmed",
		createdAt,
	};
}

function parseEnvelope(raw: string | null): unknown[] | null {
	if (typeof raw !== "string" || raw.trim() === "") {
		return null;
	}

	try {
		const parsed: unknown = JSON.parse(raw);

		if (!isRecord(parsed) || parsed.version !== ORDER_STORAGE_VERSION) {
			return null;
		}

		return Array.isArray(parsed.orders) ? parsed.orders : null;
	} catch {
		return null;
	}
}

export function parseOrders(raw: string | null): readonly Order[] {
	const candidates = parseEnvelope(raw);

	if (candidates === null) {
		return FIXTURE_ORDERS;
	}

	const orders: Order[] = [];
	const seen = new Set<string>();

	for (const candidate of candidates) {
		const order = parseOrder(candidate);

		if (order === null || seen.has(order.number)) {
			continue;
		}

		seen.add(order.number);
		orders.push(order);
	}

	return orders.length === 0 ? FIXTURE_ORDERS : orders;
}

export function serializeOrders(orders: readonly Order[]): string {
	return JSON.stringify({ version: ORDER_STORAGE_VERSION, orders });
}

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

export function readStoredOrders(storage: ReadableStorage | null | undefined): readonly Order[] {
	if (storage === null || storage === undefined) {
		return FIXTURE_ORDERS;
	}

	try {
		return parseOrders(storage.getItem(ORDER_STORAGE_KEY));
	} catch {
		return FIXTURE_ORDERS;
	}
}

export function writeStoredOrders(
	storage: WritableStorage | null | undefined,
	orders: readonly Order[],
): boolean {
	if (storage === null || storage === undefined) {
		return false;
	}

	try {
		storage.setItem(ORDER_STORAGE_KEY, serializeOrders(orders));

		return true;
	} catch {
		return false;
	}
}
