import { describe, expect, it } from "vitest";

import type { AdminProductRow } from "./product-repository";
import { findAdminProduct, listAdminProducts, toAdminProduct } from "./product-repository";

const row: AdminProductRow = {
	slug: "apple-tv-4k-2022",
	name: "Apple TV 4K (2022)",
	description: null,
	category: "ACCESSORY",
	published: false,
	featured: true,
	createdAt: new Date("2026-11-08T12:00:00.000Z"),
	gallery: [
		{
			position: 1,
			alt: "Apple TV 4K (2022) — foto 2",
			url: "/products/accessory/apple-tv-4k-2022-2.webp",
		},
		{
			position: 0,
			alt: "Apple TV 4K (2022) — foto principal",
			url: "/products/accessory/apple-tv-4k-2022-1.webp",
		},
	],
	variants: [
		{
			sku: "apple-tv-4k-2022-64gb",
			storage: "64 GB",
			color: null,
			price: 3_000_000,
			stock: 1,
		},
	],
};

describe("the row the database returns, as the panel reads it", () => {
	it("maps the gallery, the published state and the variants the panel shows", () => {
		expect(toAdminProduct(row)).toEqual({
			slug: "apple-tv-4k-2022",
			name: "Apple TV 4K (2022)",
			description: null,
			category: "ACCESSORY",
			gallery: [
				{
					position: 0,
					alt: "Apple TV 4K (2022) — foto principal",
					url: "/products/accessory/apple-tv-4k-2022-1.webp",
				},
				{
					position: 1,
					alt: "Apple TV 4K (2022) — foto 2",
					url: "/products/accessory/apple-tv-4k-2022-2.webp",
				},
			],
			published: false,
			destacado: true,
			createdAt: "2026-11-08T12:00:00.000Z",
			variants: [
				{
					sku: "apple-tv-4k-2022-64gb",
					label: "64 GB",
					priceCents: 3_000_000,
					stock: 1,
				},
			],
		});
	});

	it("keeps a product without a gallery readable", () => {
		expect(toAdminProduct({ ...row, gallery: [] }).gallery).toEqual([]);
	});
});

describe("the catalogue the panel reads today", () => {
	it("serves the fixture set", async () => {
		const listed = await listAdminProducts();

		expect(listed).toHaveLength(14);
		expect(listed.every((product) => product.gallery.length === 1)).toBe(true);
	});

	it("finds one product by its slug", async () => {
		const found = await findAdminProduct("airpods-pro-3");

		expect(found?.name).toBe("Airpods Pro 3");
	});

	it("has no product for a slug that is not there", async () => {
		expect(await findAdminProduct("no-existe")).toBeNull();
	});
});
