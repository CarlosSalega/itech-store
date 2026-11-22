import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FIXTURE_ORDERS } from "@/features/checkout/fixtures/orders";
import { ORDER_STORAGE_KEY, serializeOrders } from "@/features/checkout/storage/order-storage";

import {
	DEFAULT_ORDER_FILTERS,
	filterOrders,
	orderStatusCounts,
	updateOrderStatus,
} from "../domain/order-inbox";
import { OrdersInboxView } from "./orders-inbox-view";

const noop = () => {};

const view = (
	orders = FIXTURE_ORDERS,
	filters = DEFAULT_ORDER_FILTERS,
	visible = filterOrders(orders, filters),
) =>
	renderToStaticMarkup(
		<OrdersInboxView
			counts={orderStatusCounts(orders)}
			expanded={null}
			filters={filters}
			onClear={noop}
			onOrderStatus={noop}
			onQueryChange={noop}
			onStatusFilter={noop}
			onToggleOrder={noop}
			orders={orders}
			visible={visible}
		/>,
	);

const rows = (markup: string) =>
	markup.split("<tr").filter((row) => row.includes("IT-2026-"));

const row = (markup: string, number: string) =>
	rows(markup).find((entry) => entry.includes(number));

async function loadOrderStore() {
	vi.resetModules();

	return import("@/features/checkout/storage/order-store");
}

function fakeWindow(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));

	vi.stubGlobal("window", {
		localStorage: {
			getItem: (key: string) => data.get(key) ?? null,
			setItem: (key: string, value: string) => {
				data.set(key, value);
			},
			removeItem: (key: string) => {
				data.delete(key);
			},
		},
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("the orders inbox", () => {
	it("renders one row per order, newest first", () => {
		expect(rows(view())).toHaveLength(5);
	});

	it("keeps every column associated with its header at every width", () => {
		const markup = view();

		expect(markup).toContain("<caption");
		expect(markup.match(/<th[^>]*scope="col"/g) ?? []).toHaveLength(6);
		expect(markup).toContain("Comprador");
		expect(markup).toContain("Fecha");
		expect(markup).toContain("Total");
		expect(markup).toContain("Estado");
	});

	it("carries the count of every state in its chip and marks only the chosen one", () => {
		const markup = view();
		const chips = markup.split("<button").filter((chip) => chip.includes("aria-pressed"));
		const pressed = chips.filter((chip) => chip.includes('aria-pressed="true"'));

		expect(chips).toHaveLength(6);
		expect(pressed).toHaveLength(1);
		expect(pressed[0]).toContain("Todos");
		expect(pressed[0]).toContain(">5<");
	});

	it("returns only the rows its filter keeps", () => {
		const filters = { ...DEFAULT_ORDER_FILTERS, status: "entregado" } as const;
		const markup = view(FIXTURE_ORDERS, filters);

		expect(rows(markup)).toHaveLength(1);
		expect(row(markup, "IT-2026-0004")).toBeDefined();
		expect(markup).not.toContain("IT-2026-0005");
		expect(markup).not.toContain("IT-2026-0001");
	});

	it("says so, and offers to clear the filters, when nothing is left", () => {
		const filters = { status: "entregado", query: "sofia" } as const;
		const markup = view(FIXTURE_ORDERS, filters);

		expect(rows(markup)).toHaveLength(0);
		expect(markup).toContain("Ningún pedido coincide.");
		expect(markup).toContain("Limpiar los filtros");
	});

	it("gives the status control its word and the five states", () => {
		const markup = row(view(), "IT-2026-0002") ?? "";

		expect(markup).toContain("Estado del pedido IT-2026-0002");
		expect(markup.match(/<option/g) ?? []).toHaveLength(5);
		expect(markup).toContain('<option value="en preparación" selected="">');
	});

	it("opens one order with its lines, its payment, its delivery and its total", () => {
		const markup = renderToStaticMarkup(
			<OrdersInboxView
				counts={orderStatusCounts(FIXTURE_ORDERS)}
				expanded="IT-2026-0003"
				filters={DEFAULT_ORDER_FILTERS}
				onClear={noop}
				onOrderStatus={noop}
				onQueryChange={noop}
				onStatusFilter={noop}
				onToggleOrder={noop}
				orders={FIXTURE_ORDERS}
				visible={FIXTURE_ORDERS}
			/>,
		);

		expect(markup).toContain("IT-2026-0003 · Sofía Ramos");
		expect(markup).toContain("4 productos · 5 unidades");
		expect(markup).toContain("Apple iPad 11&quot; A16 Chip WI-FI");
		expect(markup).toContain("Pago: Transferencia bancaria");
		expect(markup).toContain("Envío: se coordina al finalizar");
		expect(markup).toContain("Av. Córdoba 1875, 4.º B, CABA (1120)");
		expect(markup).toContain("3.695.000");
		expect(markup).toContain('aria-expanded="true"');
	});

	it("totals the inbox with what is collected and what is waiting", () => {
		expect(view()).toContain(
			"5 pedidos · $ 8.040.000 en total · 2 a preparar · $ 6.010.000 cobrados sin el pedido cancelado.",
		);
	});
});

describe("a status change in the inbox", () => {
	it("goes through the order store and comes back in the inbox after a reload", async () => {
		fakeWindow({ [ORDER_STORAGE_KEY]: serializeOrders(FIXTURE_ORDERS) });
		const store = await loadOrderStore();
		const before = view(store.getOrdersSnapshot());

		expect(row(before, "IT-2026-0001")).toContain(
			'<option value="nuevo" selected="">',
		);

		store.commitOrders(
			updateOrderStatus(store.getOrdersSnapshot(), "IT-2026-0001", "entregado"),
		);

		const reloadedStore = await loadOrderStore();
		const after = reloadedStore.getOrdersSnapshot();

		expect(after.find((order) => order.number === "IT-2026-0001")?.status).toBe(
			"entregado",
		);

		const markup = view(after);
		const changed = row(markup, "IT-2026-0001") ?? "";

		expect(changed).toContain('<option value="entregado" selected="">');
		expect(changed).not.toContain('<option value="nuevo" selected="">');

		const delivered = markup
			.split("<button")
			.find((chip) => chip.includes('aria-pressed') && chip.includes("entregado"));

		expect(delivered).toContain(">2<");
	});
});
