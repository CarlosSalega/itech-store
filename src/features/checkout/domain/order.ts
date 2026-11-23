import { cartTotals, type CartLine, type CartTotals } from "@/features/cart/domain/cart";
import { messagesFromError } from "@/lib/validation/messages";

import {
	BUYER_EMAIL_MESSAGES,
	BUYER_EMAIL_SCHEMA,
	BUYER_REQUIRED_MESSAGES,
	BUYER_REQUIRED_SCHEMA,
} from "./buyer-schema";

export const ORDER_NUMBER_PATTERN = /^IT-(\d{4})-(\d{4,})$/;

export type OrderBuyer = {
	name: string;
	email: string;
	phone: string;
	address: string;
	city: string;
	postalCode: string;
};

export type BuyerField = keyof OrderBuyer;

export type BuyerErrors = Partial<Record<BuyerField, string>>;

export const BUYER_FIELDS: readonly BuyerField[] = [
	"name",
	"email",
	"phone",
	"address",
	"city",
	"postalCode",
];

export const EMPTY_BUYER: OrderBuyer = {
	name: "",
	email: "",
	phone: "",
	address: "",
	city: "",
	postalCode: "",
};

export type OrderPayment = "transfer" | "cash";

export const ORDER_PAYMENT_LABEL: Record<OrderPayment, string> = {
	transfer: "Transferencia bancaria",
	cash: "Efectivo al recibir",
};

export function orderPaymentLabel(payment: OrderPayment): string {
	return ORDER_PAYMENT_LABEL[payment];
}

export type OrderStatus =
	| "nuevo"
	| "en preparación"
	| "enviado"
	| "entregado"
	| "cancelado";

export const ORDER_STATUSES: readonly OrderStatus[] = [
	"nuevo",
	"en preparación",
	"enviado",
	"entregado",
	"cancelado",
];

export const CANCELLED_ORDER_STATUS: OrderStatus = "cancelado";

export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ["nuevo", "en preparación"];

export function isOpenOrder(order: Order): boolean {
	return OPEN_ORDER_STATUSES.includes(order.status);
}

export type OrderDelivery = "coordinated";

export type OrderLine = CartLine;

export type Order = {
	number: string;
	buyer: OrderBuyer;
	delivery: OrderDelivery;
	payment: OrderPayment;
	lines: OrderLine[];
	totals: CartTotals;
	status: OrderStatus;
	createdAt: string;
};

export function normalizeBuyer(buyer: OrderBuyer): OrderBuyer {
	return {
		name: buyer.name.trim(),
		email: buyer.email.trim(),
		phone: buyer.phone.trim(),
		address: buyer.address.trim(),
		city: buyer.city.trim(),
		postalCode: buyer.postalCode.trim(),
	};
}

export function validateBuyer(buyer: OrderBuyer): BuyerErrors {
	const trimmed = normalizeBuyer(buyer);
	const required = BUYER_REQUIRED_SCHEMA.safeParse(trimmed);
	const email = BUYER_EMAIL_SCHEMA.safeParse(trimmed);
	const found: BuyerErrors = {
		...(email.success ? {} : messagesFromError(email.error, BUYER_EMAIL_MESSAGES)),
		...(required.success
			? {}
			: messagesFromError(required.error, BUYER_REQUIRED_MESSAGES)),
	};
	const errors: BuyerErrors = {};

	for (const field of BUYER_FIELDS) {
		const message = found[field];

		if (message !== undefined) {
			errors[field] = message;
		}
	}

	return errors;
}

export function nextOrderNumber(existingNumbers: readonly string[], year: number): string {
	let highest = 0;

	for (const number of existingNumbers) {
		const match = ORDER_NUMBER_PATTERN.exec(number);

		if (match === null || Number(match[1]) !== year) {
			continue;
		}

		const sequence = Number(match[2]);

		if (sequence > highest) {
			highest = sequence;
		}
	}

	return `IT-${year}-${String(highest + 1).padStart(4, "0")}`;
}

type CreateOrderInput = {
	cartLines: readonly CartLine[];
	buyer: OrderBuyer;
	payment: OrderPayment;
	number: string;
	createdAt: string;
	status?: OrderStatus;
};

export function createOrder({
	cartLines,
	buyer,
	payment,
	number,
	createdAt,
	status = "nuevo",
}: CreateOrderInput): Order {
	if (cartLines.length === 0) {
		throw new Error("Un pedido necesita al menos un producto.");
	}

	const lines = cartLines.map((line) => ({ ...line }));

	return {
		number,
		buyer: normalizeBuyer(buyer),
		delivery: "coordinated",
		payment,
		lines,
		totals: cartTotals({ lines, lastAddedVariantId: null }),
		status,
		createdAt,
	};
}

export function findOrder(orders: readonly Order[], number: string): Order | undefined {
	return orders.find((order) => order.number === number);
}
