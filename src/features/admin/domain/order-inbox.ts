import type { Order, OrderStatus } from "@/features/checkout/domain/order";

export type OrderStatusFilter =
	| "todos"
	| "nuevo"
	| "en-preparacion"
	| "enviado"
	| "entregado"
	| "cancelado";

export const ORDER_STATUS_FILTERS = [
	"todos",
	"nuevo",
	"en-preparacion",
	"enviado",
	"entregado",
	"cancelado",
] as const satisfies readonly OrderStatusFilter[];

export const ORDER_FILTER_LABEL: Record<OrderStatusFilter, string> = {
	todos: "Todos",
	nuevo: "nuevo",
	"en-preparacion": "en preparación",
	enviado: "enviado",
	entregado: "entregado",
	cancelado: "cancelado",
};

const STATUS_OF_FILTER: Record<Exclude<OrderStatusFilter, "todos">, OrderStatus> = {
	nuevo: "nuevo",
	"en-preparacion": "en preparación",
	enviado: "enviado",
	entregado: "entregado",
	cancelado: "cancelado",
};

const FILTER_OF_STATUS: Record<OrderStatus, Exclude<OrderStatusFilter, "todos">> = {
	nuevo: "nuevo",
	"en preparación": "en-preparacion",
	enviado: "enviado",
	entregado: "entregado",
	cancelado: "cancelado",
};

export type OrderTone = "ink" | "warning" | "muted" | "success" | "danger";

const TONE_OF_STATUS: Record<OrderStatus, OrderTone> = {
	nuevo: "ink",
	"en preparación": "warning",
	enviado: "muted",
	entregado: "success",
	cancelado: "danger",
};

export function orderStatusTone(status: OrderStatus): OrderTone {
	return TONE_OF_STATUS[status];
}

export type OrderFilters = {
	query: string;
	status: OrderStatusFilter;
};

export const DEFAULT_ORDER_FILTERS: OrderFilters = {
	query: "",
	status: "todos",
};

const FULL_DATE_FORMAT = new Intl.DateTimeFormat("es-AR", {
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function orderFullDateLabel(iso: string): string {
	return FULL_DATE_FORMAT.format(new Date(iso));
}

function plain(value: string): string {
	return value
		.normalize("NFD")
		.replace(COMBINING_MARKS, "")
		.toLowerCase()
		.trim();
}

function firstValue(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

function statusFrom(value: string | undefined): OrderStatusFilter {
	return ORDER_STATUS_FILTERS.find((status) => status === value) ?? "todos";
}

export function orderFiltersFromParams(
	params: Record<string, string | string[] | undefined>,
): OrderFilters {
	return {
		query: (firstValue(params.q) ?? "").trim(),
		status: statusFrom(firstValue(params.estado)),
	};
}

export function orderFilterHref(filters: OrderFilters): string {
	const params = new URLSearchParams();
	const query = filters.query.trim();

	if (query !== "") {
		params.set("q", query);
	}

	if (filters.status !== "todos") {
		params.set("estado", filters.status);
	}

	const search = params.toString();

	return search === "" ? "/admin/pedidos" : `/admin/pedidos?${search}`;
}

function matchesStatus(order: Order, status: OrderStatusFilter): boolean {
	return status === "todos" || order.status === STATUS_OF_FILTER[status];
}

function matchesQuery(order: Order, query: string): boolean {
	if (query === "") {
		return true;
	}

	const needle = plain(query);

	return (
		plain(order.number).includes(needle) || plain(order.buyer.name).includes(needle)
	);
}

export function filterOrders(
	orders: readonly Order[],
	filters: OrderFilters,
): readonly Order[] {
	return orders
		.filter(
			(order) =>
				matchesStatus(order, filters.status) &&
				matchesQuery(order, filters.query),
		)
		.toSorted(
			(left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
		);
}

export function orderStatusCounts(
	orders: readonly Order[],
): Record<OrderStatusFilter, number> {
	const counts: Record<OrderStatusFilter, number> = {
		todos: orders.length,
		nuevo: 0,
		"en-preparacion": 0,
		enviado: 0,
		entregado: 0,
		cancelado: 0,
	};

	for (const order of orders) {
		counts[FILTER_OF_STATUS[order.status]] += 1;
	}

	return counts;
}

export function updateOrderStatus(
	orders: readonly Order[],
	number: string,
	status: OrderStatus,
): readonly Order[] {
	const target = orders.find((order) => order.number === number);

	if (target === undefined || target.status === status) {
		return orders;
	}

	return orders.map((order) =>
		order.number === number ? { ...order, status } : order,
	);
}
