import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DEFAULT_PRODUCT_FILTERS, filterAdminProducts } from "../domain/product-filters";
import { ADMIN_PRODUCTS } from "../fixtures/products";
import { ProductsTable } from "./products-table";

const render = (products = ADMIN_PRODUCTS) =>
	renderToStaticMarkup(<ProductsTable products={products} totalCount={ADMIN_PRODUCTS.length} />);

const rows = (markup: string) =>
	markup
		.split("<tr")
		.filter((row) => row.includes('href="/admin/productos/'));

describe("the products table", () => {
	it("renders one row per product", () => {
		expect(rows(render())).toHaveLength(14);
	});

	it("marks every published row with the check and the word", () => {
		const markup = render();

		for (const product of ADMIN_PRODUCTS.filter((entry) => entry.published)) {
			const row = rows(markup).find((entry) =>
				entry.includes(`href="/admin/productos/${product.slug}"`),
			);

			expect(row).toBeDefined();
			expect(row).toContain("Publicado");
			expect(row).toContain("<svg");
		}
	});

	it("says out loud that the two unpublished rows are not published", () => {
		const unpublished = rows(render()).filter((row) => row.includes("Sin publicar"));

		expect(unpublished).toHaveLength(2);
		expect(unpublished.every((row) => !row.includes(">Publicado<"))).toBe(true);
	});

	it("marks a low-stock row with its word, not only its colour", () => {
		const row = rows(render()).find((entry) =>
			entry.includes('href="/admin/productos/airpods-pro-3"'),
		);

		expect(row).toContain("stock bajo");
	});

	it("marks the two featured products with a word for screen readers", () => {
		const featured = rows(render()).filter((row) => row.includes(", destacado"));

		expect(featured).toHaveLength(2);
	});

	it("draws the photograph in the first position of the gallery in the row", () => {
		const [product] = ADMIN_PRODUCTS;
		const photographed = {
			...(product ?? ADMIN_PRODUCTS[1]),
			gallery: [
				{ position: 0, alt: " portada", url: "/products/airpods/portada.webp" },
				{ position: 1, alt: " segunda", url: "/products/airpods/segunda.webp" },
			],
		};

		const markup = render([photographed]);

		expect(markup).toContain('src="/products/airpods/portada.webp"');
		expect(markup).not.toContain('src="/products/airpods/segunda.webp"');
	});

	it("keeps every column associated with its header", () => {
		const markup = render();

		expect(markup).toContain("<caption");
		expect(markup).toContain("<thead");
		expect(markup.match(/<th[^>]*scope="col"/g) ?? []).toHaveLength(6);
	});

	it("shows only the rows a filtered view keeps", () => {
		const ipads = filterAdminProducts(ADMIN_PRODUCTS, {
			...DEFAULT_PRODUCT_FILTERS,
			family: "IPAD",
		});
		const markup = render(ipads);
		const filtered = rows(markup);

		expect(filtered).toHaveLength(2);
		expect(markup).toContain("Apple iPad 11&quot; A16 Chip WI-FI");
		expect(markup).toContain("Apple 11&quot; iPad Air M4 Space Gray");
		expect(markup).not.toContain("Airpods Pro 3");
		expect(markup).not.toContain("Apple Pencil Pro");
	});

	it("counts the filtered rows against the whole catalogue in the foot", () => {
		const markup = render(
			filterAdminProducts(ADMIN_PRODUCTS, {
				...DEFAULT_PRODUCT_FILTERS,
				status: "sin-publicar",
			}),
		);

		expect(markup).toContain("Mostrando 2 de los 14 productos");
	});

	it("names the whole catalogue when nothing is filtered", () => {
		expect(render()).toContain(
			"Mostrando los 14 productos del catálogo: 16 variantes, 12 publicados y 5 con stock bajo.",
		);
	});

	it("explains the star instead of assuming it", () => {
		expect(render()).toContain("La estrella marca los dos productos destacados en la tienda.");
	});
});
