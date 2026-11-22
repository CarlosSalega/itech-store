import {
	CANCELLED_ORDER_STATUS,
	isOpenOrder,
	type Order,
} from "@/features/checkout/domain/order";

import {
	LOW_STOCK_THRESHOLD,
	isLowOnStock,
	lowestStockVariant,
	type AdminProduct,
	type AdminVariant,
} from "./product";

export type DeltaDirection = "up" | "down" | "flat";

export type DeltaTone = "good" | "attention" | "flat";

export type DashboardDelta = {
	direction: DeltaDirection;
	tone: DeltaTone;
	label: string;
	base: string;
};

export type SoldMetric = {
	cents: number;
	orders: number;
	delta: DashboardDelta;
};

export type CountMetric = {
	count: number;
	delta: DashboardDelta;
};

export type LowStockEntry = {
	product: AdminProduct;
	variant: AdminVariant;
	units: number;
};

export type DashboardBaseline = {
	soldCentsPreviousMonth: number;
	toFulfilYesterday: number;
	publishedProductsLastMonth: number;
	lowStockLastWeek: number;
};

export type DashboardMetrics = {
	periodLabel: string;
	sold: SoldMetric;
	toFulfil: CountMetric;
	published: CountMetric;
	lowStock: CountMetric & {
		threshold: number;
		products: readonly LowStockEntry[];
	};
	orders: {
		count: number;
		cancelledCount: number;
		cancelledCents: number;
		recent: readonly Order[];
	};
	productCount: number;
};

type Month = { year: number; month: number };

const MINUS = "\u2212";

const DATE_FORMAT = new Intl.DateTimeFormat("es-AR", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
});

const MONTH_FORMAT = new Intl.DateTimeFormat("es-AR", {
	month: "long",
	timeZone: "UTC",
});

export function orderDateLabel(iso: string): string {
	return DATE_FORMAT.format(new Date(iso));
}

function monthOf(iso: string): Month {
	const date = new Date(iso);

	return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function sameMonth(left: Month, right: Month): boolean {
	return left.year === right.year && left.month === right.month;
}

function previousMonth(month: Month): Month {
	const date = new Date(Date.UTC(month.year, month.month - 1, 1));

	return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function monthName(month: Month): string {
	return MONTH_FORMAT.format(new Date(Date.UTC(month.year, month.month, 1)));
}

function capitalised(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function signed(value: number): string {
	if (value === 0) {
		return "0";
	}

	return value > 0 ? `+${value}` : `${MINUS}${Math.abs(value)}`;
}

function directionOf(current: number, previous: number): DeltaDirection {
	if (current > previous) {
		return "up";
	}

	return current < previous ? "down" : "flat";
}

function toneOf(direction: DeltaDirection, better: "higher" | "lower"): DeltaTone {
	if (direction === "flat") {
		return "flat";
	}

	const rising = direction === "up";

	return rising === (better === "higher") ? "good" : "attention";
}

function countDelta(
	current: number,
	previous: number,
	base: string,
	better: "higher" | "lower",
): DashboardDelta {
	const direction = directionOf(current, previous);

	return {
		direction,
		tone: toneOf(direction, better),
		label: signed(current - previous),
		base,
	};
}

function percentageDelta(
	current: number,
	previous: number,
	base: string,
	better: "higher" | "lower",
): DashboardDelta {
	const percentage =
		previous === 0 ? 0 : Math.round(((current - previous) / previous) * 100);
	const direction = directionOf(current, previous);

	return {
		direction,
		tone: toneOf(direction, better),
		label: `${signed(percentage)} %`,
		base,
	};
}

function newestFirst(orders: readonly Order[]): Order[] {
	return [...orders].sort(
		(left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
	);
}

function lowStockEntries(products: readonly AdminProduct[]): LowStockEntry[] {
	const entries: LowStockEntry[] = [];

	for (const product of products) {
		const variant = lowestStockVariant(product);

		if (variant !== null && isLowOnStock(product)) {
			entries.push({ product, variant, units: variant.stock });
		}
	}

	return entries.sort(
		(left, right) =>
			left.units - right.units ||
			left.product.name.localeCompare(right.product.name, "es"),
	);
}

type DashboardInput = {
	orders: readonly Order[];
	products: readonly AdminProduct[];
	baseline: DashboardBaseline;
};

export function dashboardMetrics({
	orders,
	products,
	baseline,
}: DashboardInput): DashboardMetrics {
	const sorted = newestFirst(orders);
	const newest = sorted[0];
	const period = newest === undefined ? null : monthOf(newest.createdAt);
	const recent =
		period === null
			? []
			: sorted.filter((order) => sameMonth(monthOf(order.createdAt), period));

	const paid = recent.filter(
		(order) => order.status !== CANCELLED_ORDER_STATUS,
	);
	const cancelled = recent.filter(
		(order) => order.status === CANCELLED_ORDER_STATUS,
	);
	const soldCents = paid.reduce(
		(sum, order) => sum + order.totals.totalCents,
		0,
	);
	const cancelledCents = cancelled.reduce(
		(sum, order) => sum + order.totals.totalCents,
		0,
	);

	const toFulfilCount = sorted.filter(isOpenOrder).length;
	const publishedCount = products.filter((product) => product.published).length;
	const entries = lowStockEntries(products);

	return {
		periodLabel:
			period === null
				? "Sin pedidos"
				: `${capitalised(monthName(period))} ${period.year}`,
		sold: {
			cents: soldCents,
			orders: paid.length,
			delta: percentageDelta(
				soldCents,
				baseline.soldCentsPreviousMonth,
				`contra ${
					period === null ? "el mes pasado" : monthName(previousMonth(period))
				} · ${paid.length} pedidos cobrados`,
				"higher",
			),
		},
		toFulfil: {
			count: toFulfilCount,
			delta: countDelta(
				toFulfilCount,
				baseline.toFulfilYesterday,
				"contra ayer",
				"lower",
			),
		},
		published: {
			count: publishedCount,
			delta: countDelta(
				publishedCount,
				baseline.publishedProductsLastMonth,
				"contra el mes pasado",
				"higher",
			),
		},
		lowStock: {
			count: entries.length,
			threshold: LOW_STOCK_THRESHOLD,
			products: entries,
			delta: countDelta(
				entries.length,
				baseline.lowStockLastWeek,
				"contra la semana pasada",
				"lower",
			),
		},
		orders: {
			count: recent.length,
			cancelledCount: cancelled.length,
			cancelledCents,
			recent,
		},
		productCount: products.length,
	};
}
