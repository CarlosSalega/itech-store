import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FIXTURE_ORDERS } from "@/features/checkout/fixtures/orders";

import {
	DEFAULT_ORDER_FILTERS,
	filterOrders,
	orderStatusCounts,
} from "../domain/order-inbox";
import { ORDER_ACTION_MESSAGES } from "../server/order-actions";
import { inboxMessage } from "./orders-inbox";
import { OrdersInboxView } from "./orders-inbox-view";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: () => undefined }),
	useSearchParams: () => new URLSearchParams(),
}));

const noop = () => {};

const view = (
	orders = FIXTURE_ORDERS,
	filters = DEFAULT_ORDER_FILTERS,
	visible = filterOrders(orders, filters),
	message: string | null = null,
) =>
	renderToStaticMarkup(
		<OrdersInboxView
			counts={orderStatusCounts(orders)}
			expanded={null}
			filters={filters}
			message={message}
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

const LANE = 'id="pedidos-message">';

const lane = (markup: string) => {
	const start = markup.indexOf(LANE);

	return start === -1
		? null
		: markup.slice(start + LANE.length, markup.indexOf("</p>", start));
};

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

	it("does not blame the filters when the database still has no orders", () => {
		const markup = view([]);

		expect(rows(markup)).toHaveLength(0);
		expect(markup).toContain("Todavía no hay pedidos.");
		expect(markup).not.toContain("Ningún pedido coincide.");
		expect(markup).not.toContain("Limpiar los filtros");
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
				message={null}
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

	it("says the orders come from the database, not from a demo or this browser", () => {
		const markup = view();

		expect(markup).not.toContain("de la demo");
		expect(markup).not.toContain("en este navegador");
		expect(markup).not.toContain("de muestra");
		expect(markup).toContain("Los cambios de estado se guardan en la base de datos");
	});
});

describe("the lane the inbox reserves for a refusal", () => {
	it("keeps one polite lane, empty, while nothing was refused", () => {
		const markup = view();

		expect(markup.match(/aria-live="polite"/g) ?? []).toHaveLength(1);
		expect(lane(markup)?.trim()).toBe("");
	});

	for (const [code, message] of Object.entries(ORDER_ACTION_MESSAGES)) {
		it(`shows the action's message for ${code}, next to the inbox summary`, () => {
			const refused = view(FIXTURE_ORDERS, DEFAULT_ORDER_FILTERS, undefined, message);

			expect(lane(refused)).toContain(message);
			expect(refused).toContain("5 pedidos · $ 8.040.000 en total");
		});
	}
});

describe("the inbox's answer to the action", () => {
	for (const [code, message] of Object.entries(ORDER_ACTION_MESSAGES)) {
		it(`turns ${code} into the message the lane shows`, () => {
			expect(
				inboxMessage({
					ok: false,
					code: code as keyof typeof ORDER_ACTION_MESSAGES,
					message,
				}),
			).toBe(message);
		});
	}

	it("leaves the lane empty when the change went through", () => {
		expect(inboxMessage({ ok: true, number: "IT-2026-0001", status: "entregado" })).toBeNull();
	});
});
