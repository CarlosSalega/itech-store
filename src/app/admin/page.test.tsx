import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_PRODUCTS } from "@/features/admin/fixtures/products";
import { FIXTURE_ORDERS } from "@/features/checkout/fixtures/orders";

const reads = vi.hoisted(() => ({
	listAdminOrders: vi.fn(),
	listAdminProducts: vi.fn(),
}));

vi.mock("@/features/admin/server/order-repository", () => ({
	listAdminOrders: reads.listAdminOrders,
}));

vi.mock("@/features/admin/server/product-repository", () => ({
	listAdminProducts: reads.listAdminProducts,
}));

import { loadDashboardMetrics } from "./page";

beforeEach(() => {
	reads.listAdminOrders.mockResolvedValue(FIXTURE_ORDERS);
	reads.listAdminProducts.mockResolvedValue(ADMIN_PRODUCTS);
	reads.listAdminOrders.mockClear();
	reads.listAdminProducts.mockClear();
});

describe("the dashboard on the reads the panel already makes", () => {
	it("counts the products of the same read the list screen shows", async () => {
		const { products, metrics } = await loadDashboardMetrics();

		expect(reads.listAdminProducts).toHaveBeenCalledOnce();
		expect(metrics.productCount).toBe(products.length);
		expect(metrics.published.count).toBe(
			products.filter((product) => product.published).length,
		);
		expect(metrics.lowStock.count).toBe(
			products.filter((product) =>
				product.variants.some((variant) => variant.stock <= 2),
			).length,
		);
	});

	it("uses the orders of its own read, not the browser store", async () => {
		const { orders, metrics } = await loadDashboardMetrics();

		expect(reads.listAdminOrders).toHaveBeenCalledOnce();
		expect(orders).toEqual(FIXTURE_ORDERS);
		expect(metrics.orders.count).toBe(metrics.orders.recent.length);
	});
});
