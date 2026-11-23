import { describe, expect, it } from "vitest";

import { MESSAGE_MAX_LENGTH } from "@/lib/validation/copy";
import { messagesFromError } from "@/lib/validation/messages";

import {
	BUYER_EMAIL_MESSAGES,
	BUYER_EMAIL_SCHEMA,
	BUYER_REQUIRED_MESSAGES,
	BUYER_REQUIRED_SCHEMA,
	EMAIL_PATTERN,
} from "./buyer-schema";
import { BUYER_FIELDS, EMPTY_BUYER, type OrderBuyer } from "./order";

const buyer: OrderBuyer = {
	name: "Sofía Ramos",
	email: "sofia.ramos@example.com",
	phone: "11 5555 0100",
	address: "Av. Córdoba 1875, 4.º B",
	city: "CABA",
	postalCode: "1120",
};

describe("the buyer contract", () => {
	it("asks for the six fields in the order the wizard walks them", () => {
		expect(Object.keys(BUYER_REQUIRED_SCHEMA.shape)).toEqual([...BUYER_FIELDS]);
	});

	it("accepts a complete buyer", () => {
		expect(BUYER_REQUIRED_SCHEMA.safeParse(buyer).success).toBe(true);
	});

	it("reports every blank field with the sentence the order ships", () => {
		const result = BUYER_REQUIRED_SCHEMA.safeParse(EMPTY_BUYER);
		const messages = result.success
			? {}
			: messagesFromError(result.error, BUYER_REQUIRED_MESSAGES);

		expect(messages).toEqual({
			name: "Escribí tu nombre y apellido.",
			email: "Escribí tu email.",
			phone: "Escribí un teléfono.",
			address: "Escribí la dirección de entrega.",
			city: "Escribí la ciudad.",
			postalCode: "Falta el código postal.",
		});
	});

	it("reads whitespace as an empty field", () => {
		const result = BUYER_REQUIRED_SCHEMA.safeParse({
			...buyer,
			city: "   ",
			postalCode: " ",
		});
		const messages = result.success
			? {}
			: messagesFromError(result.error, BUYER_REQUIRED_MESSAGES);

		expect(messages).toEqual({
			city: "Escribí la ciudad.",
			postalCode: "Falta el código postal.",
		});
	});
});

describe("the email shape", () => {
	it("asks for a shape that can receive a reply", () => {
		const result = BUYER_EMAIL_SCHEMA.safeParse({
			...buyer,
			email: "sofia.ramos@example",
		});
		const messages = result.success
			? {}
			: messagesFromError(result.error, BUYER_EMAIL_MESSAGES);

		expect(messages).toEqual({ email: "Ese email no parece válido." });
	});

	it("keeps accepting every address the old pattern accepted", () => {
		for (const email of ["sofia.ramos@example.com", "josé@ejemplo.com", "a@b.co"]) {
			expect(EMAIL_PATTERN.test(email)).toBe(true);
			expect(BUYER_EMAIL_SCHEMA.safeParse({ email }).success).toBe(true);
		}

		expect(EMAIL_PATTERN.test("a@b..cc")).toBe(true);
		expect(BUYER_EMAIL_SCHEMA.safeParse({ email: "a@b..cc" }).success).toBe(true);
	});
});

describe("the copy the schema is allowed to reach", () => {
	it("keeps every sentence inside one caption line", () => {
		const sentences = [
			...Object.values(BUYER_REQUIRED_MESSAGES),
			...Object.values(BUYER_EMAIL_MESSAGES),
		];

		for (const sentence of sentences) {
			expect(sentence.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
		}
	});
});
