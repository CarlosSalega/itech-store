import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CartLine } from "@/features/cart/domain/cart";

import { createOrder, type Order, type OrderBuyer } from "../domain/order";
import { OrderProofGate, OrderReceipt } from "./receipt";

const BUYER: OrderBuyer = {
	name: "Sofía Ramos",
	email: "sofia.ramos@example.com",
	phone: "11 5555 0100",
	address: "Av. Córdoba 1875, 4.º B",
	city: "CABA",
	postalCode: "1120",
};

const LINE: CartLine = {
	variantId: "apple-ipad-11-a16-chip-wi-fi-256gb",
	sku: "apple-ipad-11-a16-chip-wi-fi-256gb",
	productSlug: "apple-ipad-11-a16-chip-wi-fi",
	productName: 'Apple iPad 11" A16 Chip WI-FI',
	familyLabel: "iPad",
	variantLabel: "256 GB",
	imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
	imageAlt: "Apple iPad 11 pulgadas A16 en azul, de frente",
	unitPriceCents: 103_500_000,
	quantity: 2,
	available: true,
};

function order(status: Order["status"]): Order {
	return createOrder({
		cartLines: [LINE],
		buyer: BUYER,
		payment: "transfer",
		number: "IT-2026-0007",
		createdAt: "2026-11-20T14:05:00.000Z",
		status,
	});
}

const receipt = (status: Order["status"]) =>
	renderToStaticMarkup(<OrderReceipt order={order(status)} />);

describe("the receipt", () => {
	it("shows the buyer, the payment, the lines and the total the order stored", () => {
		const markup = receipt("nuevo");

		expect(markup).toContain("Sofía Ramos");
		expect(markup).toContain("Av. Córdoba 1875, 4.º B, CABA (1120)");
		expect(markup).toContain("11 5555 0100");
		expect(markup).toContain("sofia.ramos@example.com");
		expect(markup).toContain("Transferencia bancaria");
		expect(markup).toContain("$ 2.070.000");
		expect(markup).toContain("IT-2026-0007");
		expect(markup).toContain("Listo: el pedido quedó confirmado");
	});

	it("calls nothing confirmed once the status moved past the start", () => {
		for (const status of ["en preparación", "enviado", "entregado", "cancelado"] as const) {
			const markup = receipt(status);

			expect(markup).not.toContain("quedó confirmado");
			expect(markup).toContain(status);
		}
	});

	it("does not promise a payment coordination for a cancelled order", () => {
		const markup = receipt("cancelado");

		expect(markup).toContain("Tu pedido está cancelado");
		expect(markup).not.toContain("Coordinamos el pago");
		expect(markup).not.toContain("El envío se coordina");
	});
});

describe("the gate a receipt opens with", () => {
	it("asks for the buyer's email before showing anything", () => {
		const markup = renderToStaticMarkup(
			<OrderProofGate attempted={false} codigo="IT-2026-0007" />,
		);

		expect(markup).toContain("Buscá tu pedido");
		expect(markup).toContain('name="email"');
		expect(markup).toContain("IT-2026-0007");
		expect(markup).not.toContain("No pudimos mostrar");
	});

	it("does not say whether the order exists when the email did not match", () => {
		const markup = renderToStaticMarkup(
			<OrderProofGate attempted codigo="IT-2026-0007" />,
		);

		expect(markup).toContain(
			"No pudimos mostrar el pedido «IT-2026-0007» con esos datos. Revisá el email e intentá de nuevo.",
		);
		expect(markup).not.toContain("no existe");
	});
});
