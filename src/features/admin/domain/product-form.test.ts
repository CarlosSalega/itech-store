import { describe, expect, it } from "vitest";

import {
	EMPTY_VARIANT_DRAFT,
	blankDraft,
	draftToProduct,
	saveNote,
	validateProductDraft,
	type ProductDraft,
} from "./product-form";

const draft = (overrides: Partial<ProductDraft> = {}): ProductDraft => ({
	name: 'Apple iPad Pro 11" M5 Space Black',
	category: "IPAD",
	description: "",
	published: true,
	destacado: false,
	variants: [{ label: "128 GB", price: "1.200.000", stock: "6" }],
	...overrides,
});

describe("the draft the form starts with", () => {
	it("opens one empty variant", () => {
		const start = blankDraft();

		expect(start.variants).toEqual([EMPTY_VARIANT_DRAFT]);
		expect(start.name).toBe("");
		expect(start.category).toBe("");
		expect(start.published).toBe(true);
		expect(start.destacado).toBe(false);
	});
});

describe("what stops the save", () => {
	it("accepts a filled draft", () => {
		expect(validateProductDraft(draft(), [])).toEqual({});
	});

	it("asks for the name", () => {
		expect(validateProductDraft(draft({ name: "  " }), [])).toEqual({
			name: "Poné el nombre del producto.",
		});
	});

	it("asks for the family", () => {
		expect(validateProductDraft(draft({ category: "" }), [])).toEqual({
			category: "Elegí una familia.",
		});
	});

	it("asks for at least one variant", () => {
		expect(validateProductDraft(draft({ variants: [] }), [])).toEqual({
			variants: "Cargá al menos una variante.",
		});
	});

	it("asks for the price of the variant that has none", () => {
		const errors = validateProductDraft(
			draft({
				variants: [
					{ label: "128 GB", price: "1.200.000", stock: "6" },
					{ label: "256 GB", price: "", stock: "4" },
				],
			}),
			[],
		);

		expect(errors).toEqual({
			variantRows: [
				null,
				{ price: "Poné el precio de esta variante." },
			],
		});
	});

	it("refuses a price that is not money", () => {
		const errors = validateProductDraft(
			draft({ variants: [{ label: "128 GB", price: "mil pesos", stock: "6" }] }),
			[],
		);

		expect(errors.variantRows?.[0]?.price).toBe("Ese precio no es un número.");
	});

	it("refuses stock that is not whole units", () => {
		const errors = validateProductDraft(
			draft({ variants: [{ label: "128 GB", price: "1.200.000", stock: "2,5" }] }),
			[],
		);

		expect(errors.variantRows?.[0]?.stock).toBe("Poné el stock en unidades enteras.");
	});

	it("asks for the capacity of a variant", () => {
		const errors = validateProductDraft(
			draft({ variants: [{ label: " ", price: "1.200.000", stock: "6" }] }),
			[],
		);

		expect(errors.variantRows?.[0]?.label).toBe("Poné la capacidad de esta variante.");
	});

	it("refuses two variants with the same capacity", () => {
		const errors = validateProductDraft(
			draft({
				variants: [
					{ label: "128 GB", price: "1.200.000", stock: "6" },
					{ label: "128 GB", price: "1.300.000", stock: "2" },
				],
			}),
			[],
		);

		expect(errors.variantRows?.[1]?.label).toBe(
			"Ya hay una variante de 128 GB en este producto.",
		);
	});

	it("refuses a slug the catalogue already has", () => {
		const errors = validateProductDraft(draft(), ["apple-ipad-pro-11-m5-space-black"]);

		expect(errors.slug).toBe("Ya hay un producto con ese slug.");
	});
});

describe("the reason the save is off", () => {
	it("names the field that is missing", () => {
		expect(saveNote(validateProductDraft(draft({ name: "" }), []), draft({ name: "" }))).toBe(
			"Para guardar falta el nombre.",
		);
	});

	it("names the variant whose price is missing", () => {
		const incomplete = draft({
			variants: [
				{ label: "128 GB", price: "1.200.000", stock: "6" },
				{ label: "256 GB", price: "", stock: "4" },
			],
		});
		const errors = validateProductDraft(incomplete, []);

		expect(saveNote(errors, incomplete)).toBe("Para guardar falta el precio de la variante de 256 GB.");
	});

	it("has nothing to say when the draft is complete", () => {
		expect(saveNote(validateProductDraft(draft(), []), draft())).toBeNull();
	});
});

describe("turning the draft into a product", () => {
	it("parses the prices into cents and derives the SKUs", () => {
		const product = draftToProduct(
			draft({
				variants: [
					{ label: "128 GB", price: "1.200.000", stock: "6" },
					{ label: "256 GB", price: "1.499.000", stock: "4" },
				],
			}),
			"2026-11-24T10:00:00.000Z",
		);

		expect(product.slug).toBe("apple-ipad-pro-11-m5-space-black");
		expect(product.variants).toEqual([
			{
				sku: "apple-ipad-pro-11-m5-space-black-128gb",
				label: "128 GB",
				priceCents: 120_000_000,
				stock: 6,
			},
			{
				sku: "apple-ipad-pro-11-m5-space-black-256gb",
				label: "256 GB",
				priceCents: 149_900_000,
				stock: 4,
			},
		]);
		expect(product.createdAt).toBe("2026-11-24T10:00:00.000Z");
	});

	it("keeps an empty description as null", () => {
		expect(draftToProduct(draft({ description: "   " }), "2026-11-24T10:00:00.000Z").description)
			.toBeNull();
	});
});
