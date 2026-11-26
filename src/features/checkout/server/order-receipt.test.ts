import { describe, expect, it } from "vitest";

import {
	RECEIPT_ORDER_SELECT,
	readOrderReceipt,
	toReceiptOrder,
	type ReceiptClient,
	type ReceiptOrderRow,
} from "./order-receipt";

const ROW: ReceiptOrderRow = {
	id: "cm_order_proven",
	number: "IT-2026-0007",
	status: "en_preparacion",
	payment: "transfer",
	buyerName: "Sofía Ramos",
	buyerEmail: "sofia.ramos@example.com",
	buyerPhone: "11 5555 0100",
	buyerAddress: "Av. Córdoba 1875, 4.º B",
	buyerCity: "CABA",
	buyerPostalCode: "1120",
	createdAt: new Date("2026-11-20T14:05:00.000Z"),
	lines: [
		{
			productName: 'Apple iPad 11" A16 Chip WI-FI',
			productSlug: "apple-ipad-11-a16-chip-wi-fi",
			familyLabel: "iPad",
			variantSku: "apple-ipad-11-a16-chip-wi-fi-256gb",
			variantLabel: "256 GB",
			quantity: 2,
			unitPriceCents: 103_500_000,
			imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
			imageAlt: "Apple iPad 11 pulgadas A16 en azul, de frente",
		},
	],
};

function fakeDatabase(rows: readonly ReceiptOrderRow[]) {
	const asked: string[] = [];

	const client: ReceiptClient = {
		order: {
			findUnique: async ({ where }) => {
				asked.push(where.number);

				return rows.find((row) => row.number === where.number) ?? null;
			},
		},
	};

	return { client, asked };
}

const client = fakeDatabase([ROW]).client;

describe("the order as the domain reads it back", () => {
	it("maps the stored status onto the vocabulary the screens speak", () => {
		const order = toReceiptOrder(ROW);

		expect(order.status).toBe("en preparación");
		expect(order.payment).toBe("transfer");
		expect(order.buyer.email).toBe("sofia.ramos@example.com");
		expect(order.createdAt).toBe("2026-11-20T14:05:00.000Z");
	});

	it("totals the lines it stored instead of trusting a stored number", () => {
		const order = toReceiptOrder(ROW);

		expect(order.totals).toEqual({
			lineCount: 1,
			unitCount: 2,
			totalCents: 207_000_000,
		});
		expect(order.lines[0].unitPriceCents).toBe(103_500_000);
	});
});

describe("what the receipt resolves", () => {
	it("shows the order whose id this browser proved, without asking for an email", async () => {
		const result = await readOrderReceipt(
			{ codigo: "IT-2026-0007", proofs: [ROW.id] },
			client,
		);

		expect(result.state).toBe("visible");
		expect(result.state === "visible" && result.order.number).toBe("IT-2026-0007");
	});

	it("resolves nothing on the number alone", async () => {
		const result = await readOrderReceipt({ codigo: "IT-2026-0007" }, client);

		expect(result).toEqual({ state: "hidden", attempted: false });
	});

	it("falls back to the buyer's email when the cookie is gone", async () => {
		const result = await readOrderReceipt(
			{ codigo: "it-2026-0007 ", email: "  SOFIA.RAMOS@Example.com " },
			client,
		);

		expect(result.state).toBe("visible");
	});

	it("shows nothing for another email, and says nothing about why", async () => {
		const wrongEmail = await readOrderReceipt(
			{ codigo: "IT-2026-0007", email: "otro@example.com" },
			client,
		);

		expect(wrongEmail).toEqual({ state: "hidden", attempted: true });
		expect(wrongEmail).toEqual(
			await readOrderReceipt(
				{ codigo: "IT-2026-9999", email: "otro@example.com" },
				client,
			),
		);
	});

	it("shows nothing for a proof of a different order", async () => {
		const result = await readOrderReceipt(
			{ codigo: "IT-2026-0007", proofs: ["cm_another_browser"] },
			client,
		);

		expect(result).toEqual({ state: "hidden", attempted: false });
	});

	it("never queries the database for something that is not an order number", async () => {
		const { client: spy, asked } = fakeDatabase([ROW]);

		const result = await readOrderReceipt({ codigo: "abc" }, spy);

		expect(result).toEqual({ state: "hidden", attempted: false });
		expect(asked).toEqual([]);
	});
});

describe("the columns the receipt needs", () => {
	it("reads the buyer, the payment, the status and the lines in one query", () => {
		expect(RECEIPT_ORDER_SELECT).toMatchObject({
			number: true,
			status: true,
			payment: true,
			buyerName: true,
			buyerEmail: true,
			buyerPhone: true,
			buyerAddress: true,
			buyerCity: true,
			buyerPostalCode: true,
			createdAt: true,
		});
		expect(RECEIPT_ORDER_SELECT.lines.select).toMatchObject({
			productName: true,
			productSlug: true,
			familyLabel: true,
			variantSku: true,
			variantLabel: true,
			quantity: true,
			unitPriceCents: true,
			imageUrl: true,
			imageAlt: true,
		});
	});
});
