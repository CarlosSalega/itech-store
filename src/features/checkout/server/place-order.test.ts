import { describe, expect, it } from "vitest";

import type { CartLine } from "@/features/cart/domain/cart";
import type { CatalogueVariantRow } from "@/features/cart/server/catalogue-variant";

import type { OrderBuyer } from "../domain/order";
import {
	PLACE_ORDER_MESSAGES,
	placeOrder,
	type PlaceOrderClient,
	type PlaceOrderResult,
} from "./place-order";
import type { OrderCreateData } from "./order-number";

const IPAD: CatalogueVariantRow = {
	id: "v-ipad-256",
	sku: "apple-ipad-11-a16-chip-wi-fi-256gb",
	storage: "256 GB",
	color: "Azul",
	price: 103_500_000,
	stock: 3,
	product: {
		slug: "apple-ipad-11-a16-chip-wi-fi",
		name: 'Apple iPad 11" A16 Chip WI-FI',
		category: "IPAD",
		gallery: [{ url: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp" }],
	},
};

const PLENTY: CatalogueVariantRow = {
	...IPAD,
	id: "v-homepod-mini",
	sku: "apple-homepod-mini",
	storage: null,
	color: null,
	price: 3_000_000,
	stock: 40,
	product: {
		slug: "apple-homepod-mini",
		name: "Apple HomePod Mini",
		category: "ACCESSORY",
		gallery: [{ url: "/products/accessory/apple-homepod-mini-1.webp" }],
	},
};

const BUYER: OrderBuyer = {
	name: "Sofía Ramos",
	email: "sofia.ramos@example.com",
	phone: "11 5555 0100",
	address: "Av. Córdoba 1875, 4.º B",
	city: "CABA",
	postalCode: "1120",
};

const LINE: CartLine = {
	variantId: "v-ipad-256",
	sku: "apple-ipad-11-a16-chip-wi-fi-256gb",
	productSlug: "apple-ipad-11-a16-chip-wi-fi",
	productName: 'Apple iPad 11" A16 Chip WI-FI',
	familyLabel: "iPad",
	variantLabel: "256 GB",
	imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
	imageAlt: "Apple iPad 11 pulgadas A16 en azul, de frente",
	unitPriceCents: 103_500_000,
	quantity: 1,
	available: true,
};

function fakeDatabase(variants: readonly CatalogueVariantRow[], taken: string[] = []) {
	const created: OrderCreateData[] = [];
	const numbers = [...taken];

	const client: PlaceOrderClient = {
		variant: {
			findMany: async ({ where }) =>
				variants.filter((row) => where.id.in.includes(row.id)),
		},
		order: {
			findMany: async ({ where }) =>
				numbers
					.filter((number) => number.startsWith(where.number.startsWith))
					.map((number) => ({ number })),
			create: async ({ data }) => {
				if (numbers.includes(data.number)) {
					throw Object.assign(new Error("Unique constraint failed"), {
						code: "P2002",
					});
				}

				numbers.push(data.number);
				created.push(data);

				return { id: `order_${created.length}`, number: data.number };
			},
		},
	};

	return { client, created, numbers };
}

function place(
	lines: readonly CartLine[],
	buyer: OrderBuyer = BUYER,
	client: PlaceOrderClient = fakeDatabase([IPAD, PLENTY]).client,
): Promise<PlaceOrderResult> {
	return placeOrder(
		{ lines, buyer, payment: "transfer" },
		{ client, year: () => 2026 },
	);
}

describe("the order the checkout writes, recomputed from the server's catalogue", () => {
	it("ignores the price and the names the client sends and takes the database's", async () => {
		const { client, created } = fakeDatabase([IPAD]);
		const tampered: CartLine = {
			...LINE,
			productName: "iPad regalado",
			familyLabel: "Regalo",
			unitPriceCents: 1,
			quantity: 2,
		};

		const result = await place(
			[tampered],
			BUYER,
			client,
		);

		expect(result).toEqual({ ok: true, id: "order_1", number: "IT-2026-0001" });
		expect(created).toHaveLength(1);
		expect(created[0].totalCents).toBe(207_000_000);
		expect(created[0].lines.create).toEqual([
			{
				productName: 'Apple iPad 11" A16 Chip WI-FI',
				productSlug: "apple-ipad-11-a16-chip-wi-fi",
				familyLabel: "iPad",
				variantSku: "apple-ipad-11-a16-chip-wi-fi-256gb",
				variantLabel: "256 GB",
				quantity: 2,
				unitPriceCents: 103_500_000,
				imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
				imageAlt: 'Apple iPad 11" A16 Chip WI-FI, 256 GB · Azul',
			},
		]);
	});

	it("clamps the quantity to the catalogue's stock and to the line's ceiling", async () => {
		const { client, created } = fakeDatabase([IPAD, PLENTY]);

		await place(
			[
				{ ...LINE, quantity: 99 },
				{
					...LINE,
					variantId: "v-homepod-mini",
					quantity: 99,
				},
			],
			BUYER,
			client,
		);

		expect(created[0].lines.create.map((line) => line.quantity)).toEqual([3, 10]);
		expect(created[0].totalCents).toBe(310_500_000 + 30_000_000);
	});

	it("merges a repeated line instead of buying it twice", async () => {
		const { client, created } = fakeDatabase([IPAD]);

		await place([{ ...LINE, quantity: 1 }, { ...LINE, quantity: 2 }], BUYER, client);

		expect(created[0].lines.create).toHaveLength(1);
		expect(created[0].lines.create[0].quantity).toBe(3);
		expect(created[0].totalCents).toBe(310_500_000);
	});

	it("stores the trimmed buyer and the payment it was given", async () => {
		const { client, created } = fakeDatabase([IPAD]);

		await place(
			[LINE],
			{ ...BUYER, name: "  Sofía Ramos ", email: " sofia.ramos@example.com " },
			client,
		);

		expect(created[0]).toMatchObject({
			status: "nuevo",
			payment: "transfer",
			buyerName: "Sofía Ramos",
			buyerEmail: "sofia.ramos@example.com",
			buyerPhone: "11 5555 0100",
			buyerAddress: "Av. Córdoba 1875, 4.º B",
			buyerCity: "CABA",
			buyerPostalCode: "1120",
		});
	});
});

describe("the checkout's refusals", () => {
	it("refuses an empty cart with the copy the form already shows", async () => {
		const { client, created } = fakeDatabase([IPAD]);

		const result = await place([], BUYER, client);

		expect(result).toEqual({
			ok: false,
			code: "CARRITO_VACIO",
			message: "Tu carrito está vacío",
		});
		expect(created).toHaveLength(0);
	});

	it("refuses a product the catalogue no longer has", async () => {
		const { client, created } = fakeDatabase([IPAD]);

		const result = await place(
			[{ ...LINE, variantId: "v-ipad-gone" }],
			BUYER,
			client,
		);

		expect(result).toEqual({
			ok: false,
			code: "PRODUCTO_INEXISTENTE",
			message: "Ya no está disponible. Quitalo para seguir con la compra.",
		});
		expect(created).toHaveLength(0);
	});

	it("refuses a product the catalogue has no stock for", async () => {
		const { client, created } = fakeDatabase([{ ...IPAD, stock: 0 }]);

		const result = await place([LINE], BUYER, client);

		expect(result.ok).toBe(false);
		expect(result.ok ? "" : result.code).toBe("PRODUCTO_INEXISTENTE");
		expect(created).toHaveLength(0);
	});

	it("refuses an invalid buyer with the message the field already shows", async () => {
		const { client, created } = fakeDatabase([IPAD]);

		const result = await place(
			[LINE],
			{ ...BUYER, name: "   ", email: "sofia" },
			client,
		);

		expect(result).toMatchObject({
			ok: false,
			code: "DATOS_INVALIDOS",
			message: "Escribí tu nombre y apellido.",
			errors: {
				name: "Escribí tu nombre y apellido.",
				email: "Ese email no parece válido.",
			},
		});
		expect(created).toHaveLength(0);
	});

	it("refuses a payment the store does not offer", async () => {
		const { client, created } = fakeDatabase([IPAD]);

		const result = await placeOrder(
			{ lines: [LINE], buyer: BUYER, payment: "tarjeta" as "transfer" },
			{ client, year: () => 2026 },
		);

		expect(result).toEqual({
			ok: false,
			code: "DATOS_INVALIDOS",
			message: PLACE_ORDER_MESSAGES.DATOS_INVALIDOS,
		});
		expect(created).toHaveLength(0);
	});

	it("refuses what the database could not store without leaking the reason", async () => {
		const client: PlaceOrderClient = {
			variant: { findMany: async () => [IPAD] },
			order: {
				findMany: async () => [],
				create: async () => {
					throw Object.assign(new Error("connection lost"), { code: "P1001" });
				},
			},
		};

		const result = await place([LINE], BUYER, client);

		expect(result).toEqual({
			ok: false,
			code: "PEDIDO_NO_CREADO",
			message: "No pudimos guardar el pedido. Probá de nuevo en un momento.",
		});
	});
});

describe("the number the checkout answers", () => {
	it("continues the year already written in the database", async () => {
		const { client, created } = fakeDatabase([IPAD], ["IT-2026-0004"]);

		const result = await place([LINE], BUYER, client);

		expect(result).toEqual({ ok: true, id: "order_1", number: "IT-2026-0005" });
		expect(created[0].number).toBe("IT-2026-0005");
	});

	it("survives a collision by retrying the allocation once", async () => {
		const { client, created, numbers } = fakeDatabase([IPAD], ["IT-2026-0001"]);
		const store = client.order.create;

		client.order.create = async (args) => {
			if (args.data.number === "IT-2026-0002") {
				numbers.push(args.data.number);

				throw Object.assign(new Error("Unique constraint failed"), {
					code: "P2002",
				});
			}

			return store(args);
		};

		const result = await place([LINE], BUYER, client);

		expect(result).toMatchObject({ ok: true, number: "IT-2026-0003" });
		expect(created).toHaveLength(1);
		expect(created[0].number).toBe("IT-2026-0003");
	});
});
