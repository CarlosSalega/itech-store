import { describe, expect, it } from "vitest";
import type { ZodError } from "zod";

import { MESSAGE_MAX_LENGTH } from "@/lib/validation/copy";
import { messagesFromError } from "@/lib/validation/messages";

import { parsePricePesos } from "./product";
import {
	PRODUCT_DRAFT_MESSAGES,
	PRODUCT_DRAFT_SCHEMA,
	VARIANT_REQUIRED_MESSAGES,
	VARIANT_REQUIRED_SCHEMA,
	VARIANT_SHAPE_MESSAGES,
	VARIANT_SHAPE_SCHEMA,
} from "./product-form-schema";

function messages<Field extends string>(
	result: { success: true } | { success: false; error: ZodError },
	copy: Partial<Record<Field, string>>,
): Partial<Record<Field, string>> {
	return result.success ? {} : messagesFromError(result.error, copy);
}

describe("the draft contract", () => {
	it("asks for the name, the family and at least one variant", () => {
		const result = PRODUCT_DRAFT_SCHEMA.safeParse({
			name: "  ",
			category: "",
			variants: [],
		});

		expect(messages(result, PRODUCT_DRAFT_MESSAGES)).toEqual({
			name: "Poné el nombre del producto.",
			category: "Elegí una familia.",
			variants: "Cargá al menos una variante.",
		});
	});

	it("accepts a named draft of one family with one variant", () => {
		expect(
			PRODUCT_DRAFT_SCHEMA.safeParse({
				name: 'Apple iPad Pro 11" M5 Space Black',
				category: "IPAD",
				variants: [{ label: "128 GB", price: "1.200.000", stock: "6" }],
			}).success,
		).toBe(true);
	});
});

describe("the variant row contract", () => {
	it("asks for the capacity and the price of the row", () => {
		const result = VARIANT_REQUIRED_SCHEMA.safeParse({
			label: " ",
			price: "",
			stock: "6",
		});

		expect(messages(result, VARIANT_REQUIRED_MESSAGES)).toEqual({
			label: "Poné la capacidad de esta variante.",
			price: "Poné el precio de esta variante.",
		});
	});

	it("validates the parsed integer, never the pesos text", () => {
		const priceCents = parsePricePesos("1.035.000");

		expect(priceCents).toBe(103_500_000);
		expect(Number("1.035.000")).toBeNaN();
		expect(VARIANT_SHAPE_SCHEMA.safeParse({ priceCents, stock: 4 }).success).toBe(true);
		expect(VARIANT_SHAPE_SCHEMA.safeParse({ priceCents: "1.035.000", stock: 4 }).success).toBe(
			false,
		);
	});

	it("reports a price that is not money", () => {
		const result = VARIANT_SHAPE_SCHEMA.safeParse({
			priceCents: parsePricePesos("mil pesos"),
			stock: 4,
		});

		expect(messages(result, VARIANT_SHAPE_MESSAGES)).toEqual({
			priceCents: "Ese precio no es un número.",
		});
	});

	it("reports stock that is not whole units", () => {
		const result = VARIANT_SHAPE_SCHEMA.safeParse({
			priceCents: 120_000_000,
			stock: Number("2,5"),
		});

		expect(messages(result, VARIANT_SHAPE_MESSAGES)).toEqual({
			stock: "Poné el stock en unidades enteras.",
		});
	});

	it("accepts a zero price and zero stock", () => {
		expect(VARIANT_SHAPE_SCHEMA.safeParse({ priceCents: 0, stock: 0 }).success).toBe(true);
	});
});

describe("the copy the schemas are allowed to reach", () => {
	it("keeps every static sentence inside one caption line", () => {
		const sentences = [
			...Object.values(PRODUCT_DRAFT_MESSAGES),
			...Object.values(VARIANT_REQUIRED_MESSAGES),
			...Object.values(VARIANT_SHAPE_MESSAGES),
		];

		for (const sentence of sentences) {
			expect(sentence.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
		}
	});
});
