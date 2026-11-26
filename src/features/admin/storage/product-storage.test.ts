import { describe, expect, it } from "vitest";

import { createProduct, type AdminProduct } from "../domain/product";
import { ADMIN_PRODUCTS } from "../fixtures/products";
import {
	ADMIN_PRODUCT_STORAGE_KEY,
	parseProducts,
	readStoredProducts,
	serializeProducts,
	writeStoredProducts,
} from "./product-storage";

const product: AdminProduct = createProduct({
	name: 'Apple iPad Pro 11" M5 Space Black',
	description: "iPad Pro de 11 pulgadas con chip M5.",
	category: "IPAD",
	published: true,
	destacado: false,
	createdAt: "2026-11-20T12:00:00.000Z",
	variants: [{ label: "128 GB", priceCents: 120_000_000, stock: 6 }],
});

const envelope = (value: unknown) => JSON.stringify(value);

const stored = (products: unknown, version: unknown = 1) =>
	envelope({ version, products });

describe("reading the catalogue the panel saved", () => {
	it("round trips a product with its variants and its flags", () => {
		expect(parseProducts(serializeProducts([product]))).toEqual([product]);
	});

	it("keeps the order of the rows", () => {
		expect(
			parseProducts(serializeProducts([product, ...ADMIN_PRODUCTS.slice(0, 2)])).map(
				(entry) => entry.slug,
			),
		).toEqual([
			"apple-ipad-pro-11-m5-space-black",
			"airpods-pro-3",
			"apple-ipad-11-a16-chip-wi-fi",
		]);
	});

	it("falls back to the fixture set when nothing was saved", () => {
		expect(parseProducts(null)).toBe(ADMIN_PRODUCTS);
		expect(parseProducts("")).toBe(ADMIN_PRODUCTS);
	});

	it("falls back to the fixture set when the value is not JSON", () => {
		expect(parseProducts("{")).toBe(ADMIN_PRODUCTS);
	});

	it("falls back to the fixture set when the version is another one", () => {
		expect(parseProducts(stored([product], 2))).toBe(ADMIN_PRODUCTS);
	});

	it("falls back to the fixture set when the envelope is not one", () => {
		expect(parseProducts(envelope([product]))).toBe(ADMIN_PRODUCTS);
	});

	it("falls back to the fixture set for a catalogue saved before the gallery existed", () => {
		const before = { ...product, gallery: undefined, image: "/products/ipad/pro-1.webp" };

		expect(parseProducts(stored([before]))).toBe(ADMIN_PRODUCTS);
	});

	it("keeps an emptied catalogue empty instead of bringing the fixtures back", () => {
		expect(parseProducts(stored([]))).toEqual([]);
	});

	it("drops a row that lost its creation date", () => {
		const broken = { ...product, createdAt: "ayer" };

		expect(parseProducts(stored([broken, ...ADMIN_PRODUCTS.slice(0, 1)]))).toEqual(
			ADMIN_PRODUCTS.slice(0, 1),
		);
	});

	it("drops a row that lost its name", () => {
		const broken = { ...product, name: "" };

		expect(parseProducts(stored([broken, ...ADMIN_PRODUCTS.slice(0, 1)]))).toEqual(
			ADMIN_PRODUCTS.slice(0, 1),
		);
	});

	it("drops a row whose family is not one of the catalogue's", () => {
		const broken = { ...product, category: "TOSTADORAS" };

		expect(parseProducts(stored([broken, ...ADMIN_PRODUCTS.slice(0, 1)]))).toEqual(
			ADMIN_PRODUCTS.slice(0, 1),
		);
	});

	it("keeps a product that carries no photo and no description", () => {
		expect(parseProducts(stored([product]))[0]?.gallery).toEqual([]);
		expect(parseProducts(stored([product]))[0]?.description).toBe(
			"iPad Pro de 11 pulgadas con chip M5.",
		);
	});

	it("round trips a gallery with its positions and its alt text", () => {
		const photographed = {
			...product,
			gallery: [
				{ position: 1, alt: 'Apple iPad Pro 11" M5 — foto 2', url: "/products/ipad/pro-2.webp" },
				{ position: 0, alt: 'Apple iPad Pro 11" M5 — foto principal', url: "/products/ipad/pro-1.webp" },
			],
		};

		expect(parseProducts(stored([photographed]))[0]?.gallery).toEqual([
			{ position: 0, alt: 'Apple iPad Pro 11" M5 — foto principal', url: "/products/ipad/pro-1.webp" },
			{ position: 1, alt: 'Apple iPad Pro 11" M5 — foto 2', url: "/products/ipad/pro-2.webp" },
		]);
	});

	it("drops a row whose photograph lost its alt text", () => {
		const broken = {
			...product,
			gallery: [{ position: 0, url: "/products/ipad/pro-1.webp" }],
		};

		expect(parseProducts(stored([broken, ...ADMIN_PRODUCTS.slice(0, 1)]))).toEqual(
			ADMIN_PRODUCTS.slice(0, 1),
		);
	});

	it("drops a row whose photograph lost its position", () => {
		const broken = {
			...product,
			gallery: [{ alt: "sin posición", url: "/products/ipad/pro-1.webp" }],
		};

		expect(parseProducts(stored([broken, ...ADMIN_PRODUCTS.slice(0, 1)]))).toEqual(
			ADMIN_PRODUCTS.slice(0, 1),
		);
	});

	it("drops a variant that is not whole money and whole units", () => {
		const broken = {
			...product,
			variants: [{ ...product.variants[0], priceCents: 1.5 }],
		};

		expect(parseProducts(stored([broken]))).toBe(ADMIN_PRODUCTS);
	});

	it("keeps the whole envelope readable", () => {
		const restored = JSON.parse(serializeProducts([product]));

		expect(restored.version).toBe(1);
		expect(restored.products).toEqual([product]);
	});
});

describe("the catalogue in the browser's storage", () => {
	const storage = (value: string | null) => ({
		getItem: () => value,
		setItem: () => undefined,
	});

	it("reads what the storage holds", () => {
		expect(readStoredProducts(storage(serializeProducts([product])))).toEqual([product]);
	});

	it("reads the fixtures when there is no storage at all", () => {
		expect(readStoredProducts(null)).toBe(ADMIN_PRODUCTS);
	});

	it("survives a storage that throws on read", () => {
		const throwing = {
			getItem: () => {
				throw new Error("SecurityError");
			},
			setItem: () => undefined,
		};

		expect(readStoredProducts(throwing)).toBe(ADMIN_PRODUCTS);
	});

	it("writes under the versioned key", () => {
		const written: string[] = [];
		const writable = {
			getItem: () => null,
			setItem: (key: string, value: string) => {
				written.push(`${key}:${value}`);
			},
		};

		expect(writeStoredProducts(writable, [product])).toBe(true);
		expect(written[0]?.startsWith(`${ADMIN_PRODUCT_STORAGE_KEY}:{"version":1`)).toBe(true);
	});

	it("reports a write it could not make", () => {
		expect(writeStoredProducts(null, [product])).toBe(false);
	});
});
