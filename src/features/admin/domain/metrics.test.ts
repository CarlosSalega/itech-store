import { describe, expect, it } from "vitest";

import type { CartLine } from "@/features/cart/domain/cart";
import {
	createOrder,
	type Order,
	type OrderStatus,
} from "@/features/checkout/domain/order";
import { FIXTURE_ORDERS } from "@/features/checkout/fixtures/orders";

import { DASHBOARD_BASELINE } from "../fixtures/baseline";
import { ADMIN_PRODUCTS } from "../fixtures/products";
import { dashboardMetrics, orderDateLabel, type DashboardBaseline } from "./metrics";

const line = (unitPriceCents: number): CartLine => ({
	variantId: `v-${unitPriceCents}`,
	sku: `sku-${unitPriceCents}`,
	productSlug: "airpods-pro-3",
	productName: "Airpods Pro 3",
	familyLabel: "AirPods",
	variantLabel: null,
	imageUrl: "/products/airpods/airpods-pro-3-1.webp",
	imageAlt: "AirPods Pro 3",
	unitPriceCents,
	quantity: 1,
	available: true,
});

const buyer = {
	name: "Sofía Ramos",
	email: "sofia.ramos@example.com",
	phone: "11 5555 0100",
	address: "Av. Córdoba 1875, 4.º B",
	city: "CABA",
	postalCode: "1120",
};

function order(
	number: string,
	createdAt: string,
	status: OrderStatus,
	unitPriceCents = 1_000_000,
): Order {
	return createOrder({
		cartLines: [line(unitPriceCents)],
		buyer,
		payment: "transfer",
		number,
		createdAt,
		status,
	});
}

const metrics = dashboardMetrics({
	orders: FIXTURE_ORDERS,
	products: ADMIN_PRODUCTS,
	baseline: DASHBOARD_BASELINE,
});

const productsWithStock = (stocks: number[], published = true) => [
	{
		slug: "apple-tv-4k-2022",
		name: "Apple TV 4K (2022)",
		description: null,
		category: "ACCESSORY" as const,
		gallery: [
			{
				position: 0,
				alt: "Apple TV 4K (2022) — foto principal",
				url: "/products/accessory/apple-tv-4k-2022-1.webp",
			},
		],
		published,
		destacado: false,
		createdAt: "2026-11-08T12:00:00.000Z",
		variants: stocks.map((stock, index) => ({
			sku: `apple-tv-4k-2022-${index}`,
			label: null,
			priceCents: 3_000_000,
			stock,
		})),
	},
];

function lowStockCount(products: ReturnType<typeof productsWithStock>): number {
	return dashboardMetrics({
		orders: FIXTURE_ORDERS,
		products,
		baseline: DASHBOARD_BASELINE,
	}).lowStock.count;
}

describe("the period the dashboard reports", () => {
	it("takes the month from the newest order instead of the clock", () => {
		expect(metrics.periodLabel).toBe("Noviembre 2026");
	});

	it("names the previous month in the sold base", () => {
		expect(metrics.sold.delta.base).toBe("contra octubre · 4 pedidos cobrados");
	});
});

describe("sold this month", () => {
	it("adds the month's orders in cents", () => {
		expect(metrics.sold.cents).toBe(601_000_000);
	});

	it("counts the orders that were paid", () => {
		expect(metrics.sold.orders).toBe(4);
	});

	it("leaves the cancelled order out of the money", () => {
		const sold = dashboardMetrics({
			orders: [
				order("IT-2026-0001", "2026-11-03T11:00:00.000Z", "nuevo", 100_000),
				order("IT-2026-0002", "2026-11-12T11:00:00.000Z", "cancelado", 500_000),
			],
			products: ADMIN_PRODUCTS,
			baseline: DASHBOARD_BASELINE,
		}).sold;

		expect(sold.cents).toBe(100_000);
		expect(sold.orders).toBe(1);
	});

	it("ignores an order from another month", () => {
		const sold = dashboardMetrics({
			orders: [
				order("IT-2026-0001", "2026-10-30T11:00:00.000Z", "nuevo", 700_000),
				order("IT-2026-0002", "2026-11-03T11:00:00.000Z", "nuevo", 100_000),
			],
			products: ADMIN_PRODUCTS,
			baseline: DASHBOARD_BASELINE,
		}).sold;

		expect(sold.cents).toBe(100_000);
	});

	it("compares against the previous month as a percentage", () => {
		expect(metrics.sold.delta.direction).toBe("up");
		expect(metrics.sold.delta.label).toBe("+25 %");
	});

	it("reads the comparison base from the baseline, not from the component", () => {
		const baseline: DashboardBaseline = { ...DASHBOARD_BASELINE, soldCentsPreviousMonth: 300_500_000 };
		const sold = dashboardMetrics({
			orders: FIXTURE_ORDERS,
			products: ADMIN_PRODUCTS,
			baseline,
		}).sold;

		expect(sold.delta.label).toBe("+100 %");
	});
});

describe("orders to fulfil", () => {
	it("counts the new and in-preparation orders", () => {
		expect(metrics.toFulfil.count).toBe(2);
	});

	it("names yesterday as its base", () => {
		expect(metrics.toFulfil.delta).toEqual({
			direction: "down",
			tone: "good",
			label: "−1",
			base: "contra ayer",
		});
	});

	it("counts them across months, because a pending order does not expire", () => {
		const toFulfil = dashboardMetrics({
			orders: [
				order("IT-2026-0001", "2026-10-30T11:00:00.000Z", "en preparación"),
				order("IT-2026-0002", "2026-11-03T11:00:00.000Z", "enviado"),
			],
			products: ADMIN_PRODUCTS,
			baseline: { ...DASHBOARD_BASELINE, toFulfilYesterday: 1 },
		}).toFulfil;

		expect(toFulfil.count).toBe(1);
		expect(toFulfil.delta.direction).toBe("flat");
		expect(toFulfil.delta.label).toBe("0");
	});
});

describe("the products", () => {
	it("counts the published rows", () => {
		expect(metrics.published.count).toBe(12);
	});

	it("compares the published count with last month", () => {
		expect(metrics.published.delta).toEqual({
			direction: "up",
			tone: "good",
			label: "+2",
			base: "contra el mes pasado",
		});
	});

	it("counts a product as low on stock when any variant has two units or less", () => {
		expect(metrics.lowStock.threshold).toBe(2);
		expect(metrics.lowStock.count).toBe(5);
	});

	it("does not count a product whose scarcest variant has three units", () => {
		expect(lowStockCount(productsWithStock([3, 9]))).toBe(0);
		expect(lowStockCount(productsWithStock([4, 2]))).toBe(1);
	});

	it("counts an unpublished row too, because its stock is just as short", () => {
		expect(lowStockCount(productsWithStock([1], false))).toBe(1);
	});

	it("lists the low-stock products from the scarcest", () => {
		expect(metrics.lowStock.products.map((entry) => entry.units)).toEqual([1, 1, 2, 2, 2]);
		expect(metrics.lowStock.products.map((entry) => entry.product.name)).toEqual([
			"Airpods Pro 3",
			"Apple TV 4K (2022)",
			"Apple HomePod Mini (2da Generación)",
			'Apple iPad 11" A16 Chip WI-FI',
			"Apple Pencil Pro",
		]);
	});

	it("shows the variant that ran out first", () => {
		const ipad = metrics.lowStock.products.find(
			(entry) => entry.product.slug === "apple-ipad-11-a16-chip-wi-fi",
		);

		expect(ipad?.variant.label).toBe("512 GB");
		expect(ipad?.variant.priceCents).toBe(121_500_000);
	});

	it("compares the low-stock count with last week", () => {
		expect(metrics.lowStock.delta).toEqual({
			direction: "up",
			tone: "attention",
			label: "+3",
			base: "contra la semana pasada",
		});
	});

	it("knows how many products the panel carries", () => {
		expect(metrics.productCount).toBe(14);
	});
});

describe("the tone a delta takes", () => {
	it("reads more money as a good month", () => {
		expect(metrics.sold.delta.tone).toBe("good");
	});

	it("reads fewer orders waiting as good, even though the arrow points down", () => {
		expect(metrics.toFulfil.delta.direction).toBe("down");
		expect(metrics.toFulfil.delta.tone).toBe("good");
	});

	it("reads more low-stock products as attention, even though the arrow points up", () => {
		expect(metrics.lowStock.delta.direction).toBe("up");
		expect(metrics.lowStock.delta.tone).toBe("attention");
	});

	it("reads a flat movement as neither", () => {
		const flat = dashboardMetrics({
			orders: FIXTURE_ORDERS,
			products: ADMIN_PRODUCTS,
			baseline: {
				...DASHBOARD_BASELINE,
				soldCentsPreviousMonth: 601_000_000,
			},
		}).sold.delta;

		expect(flat.direction).toBe("flat");
		expect(flat.tone).toBe("flat");
	});

	it("reads a month that sold less as attention", () => {
		const sold = dashboardMetrics({
			orders: FIXTURE_ORDERS,
			products: ADMIN_PRODUCTS,
			baseline: {
				...DASHBOARD_BASELINE,
				soldCentsPreviousMonth: 900_000_000,
			},
		}).sold.delta;

		expect(sold.direction).toBe("down");
		expect(sold.tone).toBe("attention");
	});
});

describe("the orders behind the table", () => {
	it("lists the five fixtures newest first", () => {
		expect(metrics.orders.recent.map((entry) => entry.number)).toEqual([
			"IT-2026-0005",
			"IT-2026-0004",
			"IT-2026-0003",
			"IT-2026-0002",
			"IT-2026-0001",
		]);
	});

	it("counts them and totals the cancelled money for the foot", () => {
		expect(metrics.orders.count).toBe(5);
		expect(metrics.orders.cancelledCount).toBe(1);
		expect(metrics.orders.cancelledCents).toBe(203_000_000);
	});
});

describe("orderDateLabel", () => {
	it.each([
		["2026-11-24T14:05:00.000Z", "24 nov"],
		["2026-11-03T11:48:00.000Z", "3 nov"],
	])("writes %s as %s", (iso, label) => {
		expect(orderDateLabel(iso)).toBe(label);
	});
});
