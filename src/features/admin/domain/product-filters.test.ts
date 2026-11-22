import { describe, expect, it } from "vitest";

import { ADMIN_PRODUCTS } from "../fixtures/products";
import {
	DEFAULT_PRODUCT_FILTERS,
	filterAdminProducts,
	productFilterHref,
	productFiltersFromParams,
	productStatusCounts,
	type ProductFilters,
} from "./product-filters";

const filters = (overrides: Partial<ProductFilters> = {}): ProductFilters => ({
	...DEFAULT_PRODUCT_FILTERS,
	...overrides,
});

const names = (found: readonly { name: string }[]) => found.map((entry) => entry.name);

describe("the filters the URL carries", () => {
	it("starts with no filter at all", () => {
		expect(productFiltersFromParams({})).toEqual({
			query: "",
			family: null,
			status: "todos",
		});
	});

	it.each([
		["mac", "MAC"],
		["ipad", "IPAD"],
		["watch", "WATCH"],
		["airpods", "AIRPODS"],
		["accessory", "ACCESSORY"],
	] as const)("reads familia=%s as %s", (slug, category) => {
		expect(productFiltersFromParams({ familia: slug }).family).toBe(category);
	});

	it("leaves the family open for a value it does not know", () => {
		expect(productFiltersFromParams({ familia: "tostadoras" }).family).toBeNull();
	});

	it.each([["publicados"], ["sin-publicar"], ["stock-bajo"]] as const)(
		"reads estado=%s",
		(status) => {
			expect(productFiltersFromParams({ estado: status }).status).toBe(status);
		},
	);

	it("falls back to every status for a value it does not know", () => {
		expect(productFiltersFromParams({ estado: "borrados" }).status).toBe("todos");
	});

	it("keeps the query as it was typed", () => {
		expect(productFiltersFromParams({ q: "  iPad  " }).query).toBe("  iPad  ");
	});

	it("takes the first value when the parameter repeats", () => {
		expect(productFiltersFromParams({ familia: ["ipad", "mac"] }).family).toBe("IPAD");
	});

	it("writes the filters back into a linkable address", () => {
		expect(
			productFilterHref(
				filters({ query: "iPad", family: "IPAD", status: "publicados" }),
			),
		).toBe("/admin/productos?q=iPad&familia=ipad&estado=publicados");
	});

	it("keeps the plain address when nothing is filtered", () => {
		expect(productFilterHref(DEFAULT_PRODUCT_FILTERS)).toBe("/admin/productos");
	});

	it("round trips its own link", () => {
		const applied = filters({ query: "Air", family: "MAC", status: "stock-bajo" });
		const params = Object.fromEntries(
			new URL(productFilterHref(applied), "https://example.com").searchParams,
		);

		expect(productFiltersFromParams(params)).toEqual(applied);
	});
});

describe("the rows a filter leaves", () => {
	it("keeps every product when nothing is asked", () => {
		expect(filterAdminProducts(ADMIN_PRODUCTS, DEFAULT_PRODUCT_FILTERS)).toHaveLength(14);
	});

	it("matches the name without caring about case or accents", () => {
		expect(
			names(filterAdminProducts(ADMIN_PRODUCTS, filters({ query: "generacion" }))),
		).toEqual([
		"Apple HomePod Mini (2da Generación)",
		"Apple Airpods 5th Generación con cancelación de ruido",
	]);
	});

	it("matches the catalogue's own spelling", () => {
		expect(names(filterAdminProducts(ADMIN_PRODUCTS, filters({ query: "Generación" })))).toEqual([
			"Apple HomePod Mini (2da Generación)",
			"Apple Airpods 5th Generación con cancelación de ruido",
		]);
	});

	it("matches a SKU", () => {
		expect(
			names(filterAdminProducts(ADMIN_PRODUCTS, filters({ query: "512gb" }))),
		).toEqual(['Apple iPad 11" A16 Chip WI-FI']);
	});

	it("keeps one family", () => {
		const macs = filterAdminProducts(ADMIN_PRODUCTS, filters({ family: "MAC" }));

		expect(macs).toHaveLength(4);
		expect(macs.every((product) => product.category === "MAC")).toBe(true);
	});

	it("keeps the published rows", () => {
		expect(
			filterAdminProducts(ADMIN_PRODUCTS, filters({ status: "publicados" })),
		).toHaveLength(12);
	});

	it("keeps the rows without publish", () => {
		expect(
			names(filterAdminProducts(ADMIN_PRODUCTS, filters({ status: "sin-publicar" }))),
		).toEqual([
			'Apple 11" iPad Air M4 Space Gray',
			"Apple Watch Ultra 3 - 49mm GPS-CELL - Caja Titanio Black - Correa Ocean Black",
		]);
	});

	it("keeps the rows low on stock, published or not", () => {
		expect(
			names(filterAdminProducts(ADMIN_PRODUCTS, filters({ status: "stock-bajo" }))),
		).toEqual([
			"Airpods Pro 3",
			'Apple iPad 11" A16 Chip WI-FI',
			"Apple HomePod Mini (2da Generación)",
			"Apple TV 4K (2022)",
			"Apple Pencil Pro",
		]);
	});

	it("combines the three at once", () => {
		expect(
			names(
				filterAdminProducts(
					ADMIN_PRODUCTS,
					filters({ query: "apple", family: "WATCH", status: "publicados" }),
				),
			),
		).toEqual([
			"Apple Watch Series 11 - Caja Aluminio Negro - Correa Deportiva Negra",
			"Apple Watch SE 3 40mm",
		]);
	});

	it("keeps the fixture order instead of sorting", () => {
		expect(
			names(filterAdminProducts(ADMIN_PRODUCTS, filters({ family: "WATCH" }))),
		).toEqual([
			"Apple Watch Series 11 - Caja Aluminio Negro - Correa Deportiva Negra",
			"Apple Watch SE 3 40mm",
			"Apple Watch Ultra 3 - 49mm GPS-CELL - Caja Titanio Black - Correa Ocean Black",
		]);
	});
});

describe("the numbers the filters carry", () => {
	it("counts every status over the fixture set", () => {
		expect(productStatusCounts(ADMIN_PRODUCTS)).toEqual({
			todos: 14,
			publicados: 12,
			"sin-publicar": 2,
			"stock-bajo": 5,
		});
	});
});
