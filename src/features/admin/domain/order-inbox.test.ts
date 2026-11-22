import { FIXTURE_ORDERS } from "@/features/checkout/fixtures/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/features/checkout/domain/order";
import { describe, expect, it } from "vitest";

import { dashboardMetrics } from "./metrics";
import {
	DEFAULT_ORDER_FILTERS,
	ORDER_FILTER_LABEL,
	ORDER_STATUS_FILTERS,
	filterOrders,
	orderFilterHref,
	orderFiltersFromParams,
	orderFullDateLabel,
	orderStatusCounts,
	orderStatusTone,
	updateOrderStatus,
} from "./order-inbox";
import { DASHBOARD_BASELINE } from "../fixtures/baseline";
import { ADMIN_PRODUCTS } from "../fixtures/products";

const numbers = (orders: readonly { number: string }[]) =>
	orders.map((order) => order.number);

describe("the orders inbox filters", () => {
	it("lists every fixture order from the newest to the oldest", () => {
		expect(numbers(filterOrders(FIXTURE_ORDERS, DEFAULT_ORDER_FILTERS))).toEqual([
			"IT-2026-0005",
			"IT-2026-0004",
			"IT-2026-0003",
			"IT-2026-0002",
			"IT-2026-0001",
		]);
	});

	it("orders a shuffled inbox by creation date, not by the order it arrived in", () => {
		const shuffled = [...FIXTURE_ORDERS].reverse();

		expect(numbers(filterOrders(shuffled, DEFAULT_ORDER_FILTERS))[0]).toBe(
			"IT-2026-0005",
		);
	});

	it.each([
		["nuevo", ["IT-2026-0001"]],
		["en-preparacion", ["IT-2026-0002"]],
		["enviado", ["IT-2026-0003"]],
		["entregado", ["IT-2026-0004"]],
		["cancelado", ["IT-2026-0005"]],
	] as const)("keeps only the %s orders", (status, expected) => {
		expect(
			numbers(filterOrders(FIXTURE_ORDERS, { ...DEFAULT_ORDER_FILTERS, status })),
		).toEqual(expected);
	});

	it("counts each status and the whole inbox", () => {
		expect(orderStatusCounts(FIXTURE_ORDERS)).toEqual({
			todos: 5,
			nuevo: 1,
			"en-preparacion": 1,
			enviado: 1,
			entregado: 1,
			cancelado: 1,
		});
	});

	it("counts every status once, in the order the chips show them", () => {
		expect(ORDER_STATUS_FILTERS).toEqual([
			"todos",
			"nuevo",
			"en-preparacion",
			"enviado",
			"entregado",
			"cancelado",
		]);
	});

	it("finds an order by its number", () => {
		expect(
			numbers(filterOrders(FIXTURE_ORDERS, { ...DEFAULT_ORDER_FILTERS, query: "0003" })),
		).toEqual(["IT-2026-0003"]);
	});

	it("finds an order by its buyer without caring about case or accents", () => {
		expect(
			numbers(filterOrders(FIXTURE_ORDERS, { ...DEFAULT_ORDER_FILTERS, query: "JULIAN" })),
		).toEqual(["IT-2026-0004", "IT-2026-0002"]);
	});

	it("combines the status and the search into one result", () => {
		expect(
			filterOrders(FIXTURE_ORDERS, { status: "entregado", query: "julian" }),
		).toEqual([FIXTURE_ORDERS[1]]);
	});

	it("leaves nothing when the search and the status cannot agree", () => {
		expect(
			filterOrders(FIXTURE_ORDERS, { status: "entregado", query: "sofia" }),
		).toEqual([]);
	});
});

describe("the orders inbox in the URL", () => {
	it("reads the status and the search from the query string", () => {
		expect(
			orderFiltersFromParams({ estado: "en-preparacion", q: " pereyra " }),
		).toEqual({ status: "en-preparacion", query: "pereyra" });
	});

	it("falls back to every status when the query string names an unknown one", () => {
		expect(orderFiltersFromParams({ estado: "perdido" })).toEqual(
			DEFAULT_ORDER_FILTERS,
		);
	});

	it("points at the plain inbox when nothing is filtered", () => {
		expect(orderFilterHref(DEFAULT_ORDER_FILTERS)).toBe("/admin/pedidos");
	});

	it("writes back exactly what it reads", () => {
		const filters = { status: "cancelado", query: "camila duarte" } as const;
		const href = orderFilterHref(filters);
		const params = Object.fromEntries(
			new URLSearchParams(href.slice(href.indexOf("?") + 1)),
		);

		expect(href.startsWith("/admin/pedidos?")).toBe(true);
		expect(orderFiltersFromParams(params)).toEqual(filters);
	});
});

describe("the order status controls", () => {
	it("changes only the order it names", () => {
		const changed = updateOrderStatus(FIXTURE_ORDERS, "IT-2026-0001", "entregado");

		expect(changed).toHaveLength(FIXTURE_ORDERS.length);
		expect(changed.find((order) => order.number === "IT-2026-0001")?.status).toBe(
			"entregado",
		);
		expect(changed[1]).toBe(FIXTURE_ORDERS[1]);
		expect(FIXTURE_ORDERS[4].status).toBe("nuevo");
	});

	it("keeps the same list when the status did not change or the order is unknown", () => {
		expect(updateOrderStatus(FIXTURE_ORDERS, "IT-2026-0001", "nuevo")).toBe(
			FIXTURE_ORDERS,
		);
		expect(updateOrderStatus(FIXTURE_ORDERS, "IT-2026-9999", "enviado")).toBe(
			FIXTURE_ORDERS,
		);
	});

	it("carries the word of every status and the tone that ranks it", () => {
		const tones: Record<OrderStatus, string> = {
			nuevo: "ink",
			"en preparación": "warning",
			enviado: "muted",
			entregado: "success",
			cancelado: "danger",
		};

		for (const status of ORDER_STATUSES) {
			expect(orderStatusTone(status)).toBe(tones[status]);
		}
	});

	it("labels the chips with the store's own status words", () => {
		expect(ORDER_FILTER_LABEL).toEqual({
			todos: "Todos",
			nuevo: "nuevo",
			"en-preparacion": "en preparación",
			enviado: "enviado",
			entregado: "entregado",
			cancelado: "cancelado",
		});
	});
});

describe("the order detail facts", () => {
	it("writes the order date in full", () => {
		expect(orderFullDateLabel("2026-11-20T14:05:00.000Z")).toBe(
			"20 de noviembre de 2026",
		);
	});
});

describe("the dashboard and the inbox", () => {
	it("count what to prepare from the same orders after a status change", () => {
		const changed = updateOrderStatus(FIXTURE_ORDERS, "IT-2026-0001", "entregado");
		const counts = orderStatusCounts(changed);
		const metrics = dashboardMetrics({
			orders: changed,
			products: ADMIN_PRODUCTS,
			baseline: DASHBOARD_BASELINE,
		});

		expect(counts.nuevo + counts["en-preparacion"]).toBe(1);
		expect(metrics.toFulfil.count).toBe(1);
	});

	it("move a cancelled order out of the collected money", () => {
		const changed = updateOrderStatus(FIXTURE_ORDERS, "IT-2026-0001", "cancelado");
		const metrics = dashboardMetrics({
			orders: changed,
			products: ADMIN_PRODUCTS,
			baseline: DASHBOARD_BASELINE,
		});

		expect(metrics.orders.cancelledCount).toBe(2);
		expect(metrics.sold.cents).toBe(479_500_000);
	});
});
