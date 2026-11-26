import type { OrderStatus as OrderStatusRow } from "@/generated/prisma/enums";

import type { CartLine } from "@/features/cart/domain/cart";

import {
	ORDER_NUMBER_PATTERN,
	createOrder,
	type Order,
	type OrderBuyer,
	type OrderPayment,
	type OrderStatus,
} from "../domain/order";
import { hasOrderProof } from "./order-proof";

const STATUS_FROM_ROW: Record<OrderStatusRow, OrderStatus> = {
	nuevo: "nuevo",
	en_preparacion: "en preparación",
	enviado: "enviado",
	entregado: "entregado",
	cancelado: "cancelado",
};

export type ReceiptLineRow = {
	productName: string;
	productSlug: string;
	familyLabel: string;
	variantSku: string;
	variantLabel: string | null;
	quantity: number;
	unitPriceCents: number;
	imageUrl: string | null;
	imageAlt: string;
};

export type ReceiptOrderRow = {
	id: string;
	number: string;
	status: OrderStatusRow;
	payment: OrderPayment;
	buyerName: string;
	buyerEmail: string;
	buyerPhone: string;
	buyerAddress: string;
	buyerCity: string;
	buyerPostalCode: string;
	createdAt: Date;
	lines: readonly ReceiptLineRow[];
};

export const RECEIPT_ORDER_SELECT = {
	id: true,
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
	lines: {
		select: {
			productName: true,
			productSlug: true,
			familyLabel: true,
			variantSku: true,
			variantLabel: true,
			quantity: true,
			unitPriceCents: true,
			imageUrl: true,
			imageAlt: true,
		},
		orderBy: { id: "asc" },
	},
} as const;

export type ReceiptClient = {
	order: {
		findUnique(args: {
			where: { number: string };
			select: typeof RECEIPT_ORDER_SELECT;
		}): Promise<ReceiptOrderRow | null>;
	};
};

export type ReceiptLookup = {
	codigo: string;
	email?: string | null;
	proofs?: readonly string[];
};

export type ReceiptResult =
	| { state: "visible"; order: Order }
	| { state: "hidden"; attempted: boolean };

function toReceiptLine(row: ReceiptLineRow): CartLine {
	return {
		variantId: row.variantSku,
		sku: row.variantSku,
		productSlug: row.productSlug,
		productName: row.productName,
		familyLabel: row.familyLabel,
		variantLabel: row.variantLabel,
		imageUrl: row.imageUrl,
		imageAlt: row.imageAlt,
		unitPriceCents: row.unitPriceCents,
		quantity: row.quantity,
		available: true,
	};
}

function buyerOf(row: ReceiptOrderRow): OrderBuyer {
	return {
		name: row.buyerName,
		email: row.buyerEmail,
		phone: row.buyerPhone,
		address: row.buyerAddress,
		city: row.buyerCity,
		postalCode: row.buyerPostalCode,
	};
}

export function toReceiptOrder(row: ReceiptOrderRow): Order {
	return createOrder({
		cartLines: row.lines.map(toReceiptLine),
		buyer: buyerOf(row),
		payment: row.payment,
		number: row.number,
		createdAt: row.createdAt.toISOString(),
		status: STATUS_FROM_ROW[row.status],
	});
}

export function normalizeOrderNumber(value: string): string {
	return value.trim().toUpperCase();
}

function normalizedEmail(value: string | null | undefined): string {
	return typeof value === "string" ? value.trim().toLowerCase() : "";
}

let defaultClient: ReceiptClient | undefined;

async function client(): Promise<ReceiptClient> {
	if (defaultClient !== undefined) {
		return defaultClient;
	}

	const { prisma } = await import("@/lib/prisma");

	defaultClient = { order: prisma.order };

	return defaultClient;
}

export async function readOrderReceipt(
	lookup: ReceiptLookup,
	source?: ReceiptClient,
): Promise<ReceiptResult> {
	const number = normalizeOrderNumber(lookup.codigo);
	const email = normalizedEmail(lookup.email);
	const attempted = email !== "";
	const hidden: ReceiptResult = { state: "hidden", attempted };

	if (!ORDER_NUMBER_PATTERN.test(number)) {
		return hidden;
	}

	const row = await (source ?? (await client())).order.findUnique({
		where: { number },
		select: RECEIPT_ORDER_SELECT,
	});

	if (row === null || row.lines.length === 0) {
		return hidden;
	}

	if (hasOrderProof(lookup.proofs ?? [], row.id)) {
		return { state: "visible", order: toReceiptOrder(row) };
	}

	if (attempted && normalizedEmail(row.buyerEmail) === email) {
		return { state: "visible", order: toReceiptOrder(row) };
	}

	return hidden;
}
