import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FIXTURE_ORDERS } from "@/features/checkout/fixtures/orders";

import { dashboardMetrics } from "../domain/metrics";
import { DASHBOARD_BASELINE } from "../fixtures/baseline";
import { ADMIN_PRODUCTS } from "../fixtures/products";
import { AdminDashboard } from "./dashboard";

const markup = renderToStaticMarkup(
	<AdminDashboard
		metrics={dashboardMetrics({
			orders: FIXTURE_ORDERS,
			products: ADMIN_PRODUCTS,
			baseline: DASHBOARD_BASELINE,
		})}
	/>,
);

const rows = markup.split("<tr").filter((row) => row.includes("IT-2026-"));

describe("the dashboard", () => {
	it("renders the five fixture orders", () => {
		expect(rows).toHaveLength(5);
	});

	it.each([
		["IT-2026-0005", "2.030.000"],
		["IT-2026-0004", "850.000"],
		["IT-2026-0003", "3.695.000"],
		["IT-2026-0002", "250.000"],
		["IT-2026-0001", "1.215.000"],
	])("renders %s with its own total", (number, amount) => {
		const row = rows.find((entry) => entry.includes(number));

		expect(row).toBeDefined();
		expect(row).toContain(`${amount}</span>`);
	});

	it("renders every status the fixtures carry", () => {
		for (const status of [
			"nuevo",
			"en preparación",
			"enviado",
			"entregado",
			"cancelado",
		]) {
			expect(markup).toContain(`>${status}<`);
		}
	});

	it("renders the month's money with its delta and base", () => {
		expect(markup).toContain("6.010.000");
		expect(markup).toContain("+25 %");
		expect(markup).toContain("contra octubre · 4 pedidos cobrados");
		expect(markup).toContain("5 pedidos: 4 cobrados por $ 6.010.000 y uno cancelado por $ 2.030.000.");
	});

	it("renders the other three metrics with the base each one names", () => {
		expect(markup).toContain("−1");
		expect(markup).toContain("contra ayer");
		expect(markup).toContain("contra el mes pasado");
		expect(markup).toContain("+3");
		expect(markup).toContain("contra la semana pasada");
	});

	it("lists the low-stock products with their units", () => {
		expect(markup).toContain("Airpods Pro 3");
		expect(markup).toContain('href="/admin/productos/apple-ipad-11-a16-chip-wi-fi"');
		expect(markup).toContain("512 GB");
		expect(markup).toContain("en stock");
		expect(markup).toContain(
			"/products/accessory/apple-tv-4k-2022-1.webp",
		);
	});

	it("says the products come from the database and the orders from the demo", () => {
		expect(markup).not.toContain("Los datos de este panel son de ejemplo");
		expect(markup).toContain(
			"Los 14 productos salen de la base de datos y los 5 pedidos son los de la demo.",
		);
	});
});
