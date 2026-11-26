import { describe, expect, it } from "vitest";

import type {
	AdminProductClient,
	AdminProductRow,
} from "./product-repository";
import {
	findAdminProduct,
	listAdminProducts,
	toAdminProduct,
} from "./product-repository";

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

const second: AdminProductRow = {
	slug: "airpods-pro-3",
	name: "Airpods Pro 3",
	description: "Los auriculares.",
	category: "AIRPODS",
	published: true,
	featured: false,
	createdAt: new Date("2026-11-03T10:15:00.000Z"),
	gallery: [],
	variants: [],
};

function stubClient(rows: readonly AdminProductRow[]) {
	const asked: string[] = [];
	const client: AdminProductClient = {
		product: {
			findMany: async (args) => {
				asked.push(
					`findMany:${args.orderBy.createdAt}:${args.select.gallery.orderBy.position}`,
				);

				return rows;
			},
			findUnique: async (args) => {
				asked.push(`findUnique:${args.where.slug}`);

				return rows.find((candidate) => candidate.slug === args.where.slug) ?? null;
			},
		},
	};

	return { client, asked };
}

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

	it("reads a description the form emptied as no description", () => {
		expect(toAdminProduct({ ...row, description: "" }).description).toBeNull();
		expect(toAdminProduct({ ...row, description: "  " }).description).toBeNull();
	});
});

describe("the catalogue the panel reads from the client", () => {
	it("maps every row the client returns", async () => {
		const { client } = stubClient([row, second]);

		expect(await listAdminProducts(client)).toEqual([
			toAdminProduct(row),
			toAdminProduct(second),
		]);
	});

	it("asks the database for the gallery by position and the list oldest first", async () => {
		const { client, asked } = stubClient([]);

		await listAdminProducts(client);

		expect(asked).toEqual(["findMany:asc:asc"]);
	});

	it("finds one product by its slug", async () => {
		const { client, asked } = stubClient([row, second]);

		expect(await findAdminProduct("airpods-pro-3", client)).toEqual(
			toAdminProduct(second),
		);
		expect(asked).toEqual(["findUnique:airpods-pro-3"]);
	});

	it("has no product for a slug that is not there", async () => {
		const { client } = stubClient([row]);

		expect(await findAdminProduct("no-existe", client)).toBeNull();
	});
});
