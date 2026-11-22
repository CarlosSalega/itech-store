import { cartTotals, type CartLine, type CartTotals } from "@/features/cart/domain/cart";

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

const BLANK_MESSAGE: Record<BuyerField, string> = {
	name: "Escribí tu nombre y apellido.",
	email: "Escribí tu email.",
	phone: "Escribí un teléfono.",
	address: "Escribí la dirección de entrega.",
	city: "Escribí la ciudad.",
	postalCode: "Falta el código postal.",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type OrderPayment = "transfer" | "cash";

export const ORDER_PAYMENT_LABEL: Record<OrderPayment, string> = {
	transfer: "Transferencia bancaria",
	cash: "Efectivo al recibir",
};

export function orderPaymentLabel(payment: OrderPayment): string {
	return ORDER_PAYMENT_LABEL[payment];
}

export type OrderStatus = "confirmed";

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
	const errors: BuyerErrors = {};

	for (const field of BUYER_FIELDS) {
		if (trimmed[field] === "") {
			errors[field] = BLANK_MESSAGE[field];
		}
	}

	if (errors.email === undefined && !EMAIL_PATTERN.test(trimmed.email)) {
		errors.email = "Ese email no parece válido.";
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
};

export function createOrder({
	cartLines,
	buyer,
	payment,
	number,
	createdAt,
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
		status: "confirmed",
		createdAt,
	};
}

export function findOrder(orders: readonly Order[], number: string): Order | undefined {
	return orders.find((order) => order.number === number);
}
