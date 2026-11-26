import { describe, expect, it } from "vitest";

import { RECEIPT_ORDER_SELECT } from "@/features/checkout/server/order-receipt";

import {
	listAdminOrders,
	toAdminOrder,
	type AdminOrderClient,
	type AdminOrderRow,
} from "./order-repository";

const IPAD: AdminOrderRow["lines"][number] = {
	productName: 'Apple iPad 11" A16 Chip WI-FI',
	productSlug: "apple-ipad-11-a16-chip-wi-fi",
	familyLabel: "iPad",
	variantSku: "apple-ipad-11-a16-chip-wi-fi-256gb",
	variantLabel: "Capacidad 256 GB",
	quantity: 2,
	unitPriceCents: 103_500_000,
	imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
	imageAlt: "Apple iPad 11 pulgadas A16 en azul, de frente",
};

const COVER: AdminOrderRow["lines"][number] = {
	productName: "Apple Pencil Pro",
	productSlug: "apple-pencil-pro",
	familyLabel: "iPad",
	variantSku: "apple-pencil-pro-blanco",
	variantLabel: null,
	quantity: 1,
	unitPriceCents: 27_000_000,
	imageUrl: null,
	imageAlt: "",
};

const ROW: AdminOrderRow = {
	id: "order_1",
	number: "IT-2026-0007",
	status: "en_preparacion",
	payment: "transfer",
	buyerName: "Sofía Ramos",
	buyerEmail: "sofia.ramos@example.com",
	buyerPhone: "11 5555 0100",
	buyerAddress: "Av. Córdoba 1875, 4.º B",
	buyerCity: "CABA",
	buyerPostalCode: "1120",
	createdAt: new Date("2026-11-27T12:30:00.000Z"),
	lines: [IPAD, COVER],
};

function fakeClient(rows: readonly AdminOrderRow[]) {
	const calls: { select: unknown; orderBy: unknown }[] = [];
	let reads = 0;

	const client: AdminOrderClient = {
		order: {
			findMany: async (args) => {
				reads += 1;
				calls.push({ select: args.select, orderBy: args.orderBy });

				return rows;
			},
		},
	};

	return { client, calls, reads: () => reads };
}

describe("the order rows the panel maps", () => {
	it("maps a row into the order shape the inbox already reads", () => {
		const order = toAdminOrder(ROW);

		expect(order.number).toBe("IT-2026-0007");
		expect(order.status).toBe("en preparación");
		expect(order.payment).toBe("transfer");
		expect(order.delivery).toBe("coordinated");
		expect(order.createdAt).toBe("2026-11-27T12:30:00.000Z");
		expect(order.buyer).toEqual({
			name: "Sofía Ramos",
			email: "sofia.ramos@example.com",
			phone: "11 5555 0100",
			address: "Av. Córdoba 1875, 4.º B",
			city: "CABA",
			postalCode: "1120",
		});
	});

	it("keeps every line as the buyer's snapshot of the product", () => {
		const [first, second] = toAdminOrder(ROW).lines;

		expect(first).toEqual({
			variantId: "apple-ipad-11-a16-chip-wi-fi-256gb",
			sku: "apple-ipad-11-a16-chip-wi-fi-256gb",
			productSlug: "apple-ipad-11-a16-chip-wi-fi",
			productName: 'Apple iPad 11" A16 Chip WI-FI',
			familyLabel: "iPad",
			variantLabel: "Capacidad 256 GB",
			imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
			imageAlt: "Apple iPad 11 pulgadas A16 en azul, de frente",
			unitPriceCents: 103_500_000,
			quantity: 2,
			available: true,
		});
		expect(second?.variantLabel).toBeNull();
		expect(second?.imageUrl).toBeNull();
	});

	it("recomputes the totals from the lines, since no row stores them", () => {
		const order = toAdminOrder(ROW);

		expect(order.totals).toEqual({
			lineCount: 2,
			unitCount: 3,
			totalCents: 234_000_000,
		});
	});
});

describe("the orders the panel lists", () => {
	it("reads every order with its lines, newest first, in one query", async () => {
		const { client, calls, reads } = fakeClient([ROW]);

		await listAdminOrders(client);

		expect(reads()).toBe(1);
		expect(calls[0]?.select).toBe(RECEIPT_ORDER_SELECT);
		expect(calls[0]?.orderBy).toEqual({ createdAt: "desc" });
	});

	it("answers one mapped order per row, in the order the database gave them", async () => {
		const older: AdminOrderRow = {
			...ROW,
			id: "order_2",
			number: "IT-2026-0006",
			status: "entregado",
			createdAt: new Date("2026-11-26T09:00:00.000Z"),
		};
		const { client } = fakeClient([ROW, older]);

		const orders = await listAdminOrders(client);

		expect(orders.map((order) => order.number)).toEqual([
			"IT-2026-0007",
			"IT-2026-0006",
		]);
		expect(orders[1]?.status).toBe("entregado");
	});

	it("answers an empty inbox when the database has no orders", async () => {
		const { client } = fakeClient([]);

		await expect(listAdminOrders(client)).resolves.toEqual([]);
	});
});
