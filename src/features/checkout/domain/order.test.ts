import { describe, expect, it } from "vitest";

import type { CartLine } from "@/features/cart/domain/cart";

import {
	createOrder,
	nextOrderNumber,
	orderPaymentLabel,
	validateBuyer,
	type BuyerField,
	type OrderBuyer,
} from "./order";

function line(overrides: Partial<CartLine> = {}): CartLine {
	return {
		variantId: "v-ipad-256",
		sku: "apple-ipad-11-a16-chip-wi-fi-256gb",
		productSlug: "apple-ipad-11-a16-chip-wi-fi",
		productName: 'Apple iPad 11" A16 Chip WI-FI',
		familyLabel: "iPad",
		variantLabel: "Capacidad 256 GB",
		imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
		imageAlt: "Apple iPad 11 pulgadas A16 en azul, de frente",
		unitPriceCents: 103_500_000,
		quantity: 1,
		available: true,
		...overrides,
	};
}

const buyer: OrderBuyer = {
	name: "Sofía Ramos",
	email: "sofia.ramos@example.com",
	phone: "11 5555 0100",
	address: "Av. Córdoba 1875, 4.º B",
	city: "CABA",
	postalCode: "1120",
};

const blankMessages: [BuyerField, string][] = [
	["name", "Escribí tu nombre y apellido."],
	["email", "Escribí tu email."],
	["phone", "Escribí un teléfono."],
	["address", "Escribí la dirección de entrega."],
	["city", "Escribí la ciudad."],
	["postalCode", "Falta el código postal."],
];

describe("validateBuyer", () => {
	it("accepts a complete buyer without messages", () => {
		expect(validateBuyer(buyer)).toEqual({});
	});

	it.each(blankMessages)("reports %s when it is only whitespace", (field, message) => {
		expect(validateBuyer({ ...buyer, [field]: "   " })).toEqual({ [field]: message });
	});

	it("reports an email that cannot receive a reply", () => {
		expect(validateBuyer({ ...buyer, email: "sofia.ramos@example" })).toEqual({
			email: "Ese email no parece válido.",
		});
	});

	it("reports every missing field at once, in field order", () => {
		const empty: OrderBuyer = {
			name: "",
			email: "",
			phone: "",
			address: "",
			city: "",
			postalCode: "",
		};

		expect(Object.keys(validateBuyer(empty))).toEqual(blankMessages.map(([field]) => field));
	});
});

describe("nextOrderNumber", () => {
	it("starts at one when the year has no orders yet", () => {
		expect(nextOrderNumber([], 2026)).toBe("IT-2026-0001");
	});

	it("continues after the highest order of that year", () => {
		expect(
			nextOrderNumber(["IT-2026-0001", "IT-2026-0003", "IT-2026-0002"], 2026),
		).toBe("IT-2026-0004");
	});

	it("ignores other years and codes it cannot read", () => {
		expect(nextOrderNumber(["IT-2025-0042", "PEDIDO-2026-0009", "IT-2026-"], 2026)).toBe(
			"IT-2026-0001",
		);
	});

	it("keeps growing past four digits", () => {
		expect(nextOrderNumber(["IT-2026-9999"], 2026)).toBe("IT-2026-10000");
	});
});

describe("createOrder", () => {
	const createdAt = "2026-11-22T01:42:42.000Z";

	it("snapshots the cart lines and totals them in cents", () => {
		const lines = [
			line(),
			line({
				variantId: "v-watch",
				sku: "apple-watch-series-11",
				productName: "Apple Watch Series 11",
				familyLabel: "Watch",
				variantLabel: null,
				unitPriceCents: 60_000_000,
				quantity: 2,
			}),
		];

		const order = createOrder({
			cartLines: lines,
			buyer,
			payment: "transfer",
			number: "IT-2026-0004",
			createdAt,
		});

		expect(order.totals).toEqual({
			lineCount: 2,
			unitCount: 3,
			totalCents: 103_500_000 + 120_000_000,
		});
		expect(order.lines).toHaveLength(2);
		expect(order.lines[0]).not.toBe(lines[0]);
	});

	it("records the number, the payment, the status and the moment", () => {
		const order = createOrder({
			cartLines: [line()],
			buyer,
			payment: "cash",
			number: "IT-2026-0001",
			createdAt,
		});

		expect(order.number).toBe("IT-2026-0001");
		expect(order.payment).toBe("cash");
		expect(order.status).toBe("confirmed");
		expect(order.delivery).toBe("coordinated");
		expect(order.createdAt).toBe(createdAt);
	});

	it("trims the buyer it stores", () => {
		const order = createOrder({
			cartLines: [line()],
			buyer: { ...buyer, name: "  Sofía Ramos  ", city: " CABA " },
			payment: "transfer",
			number: "IT-2026-0001",
			createdAt,
		});

		expect(order.buyer).toEqual({ ...buyer, name: "Sofía Ramos", city: "CABA" });
	});

	it("refuses an order with nothing in it", () => {
		expect(() =>
			createOrder({
				cartLines: [],
				buyer,
				payment: "transfer",
				number: "IT-2026-0001",
				createdAt,
			}),
		).toThrow();
	});

	it("names the two payment choices in the flow's words", () => {
		expect(orderPaymentLabel("transfer")).toBe("Transferencia bancaria");
		expect(orderPaymentLabel("cash")).toBe("Efectivo al recibir");
	});
});
