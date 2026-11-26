import { MAX_LINE_QUANTITY, cartTotals, type CartLine } from "@/features/cart/domain/cart";
import {
	CATALOGUE_VARIANT_SELECT,
	toCatalogueVariant,
	type CatalogueVariantRow,
} from "@/features/cart/server/catalogue-variant";
import { applyRevalidation, type CatalogVariant } from "@/features/cart/server/revalidation";

import {
	BUYER_FIELDS,
	normalizeBuyer,
	validateBuyer,
	type BuyerErrors,
	type OrderBuyer,
	type OrderPayment,
} from "../domain/order";
import {
	createWithOrderNumber,
	type OrderCreateData,
	type OrderLineCreateData,
	type OrderNumberClient,
} from "./order-number";

const MAX_LINES = 50;
const MAX_ID_LENGTH = 64;

const PAYMENTS: readonly OrderPayment[] = ["transfer", "cash"];

export type PlaceOrderInput = {
	lines: readonly CartLine[];
	buyer: OrderBuyer;
	payment: OrderPayment;
};

export type PlaceOrderRefusal =
	| "CARRITO_VACIO"
	| "DATOS_INVALIDOS"
	| "PRODUCTO_INEXISTENTE"
	| "PEDIDO_NO_CREADO";

export const PLACE_ORDER_MESSAGES: Record<PlaceOrderRefusal, string> = {
	CARRITO_VACIO: "Tu carrito está vacío",
	DATOS_INVALIDOS: "Revisá los datos de quien recibe el pedido.",
	PRODUCTO_INEXISTENTE: "Ya no está disponible. Quitalo para seguir con la compra.",
	PEDIDO_NO_CREADO: "No pudimos guardar el pedido. Probá de nuevo en un momento.",
};

export type PlaceOrderResult =
	| { ok: true; id: string; number: string }
	| { ok: false; code: PlaceOrderRefusal; message: string; errors?: BuyerErrors };

export type PlaceOrderRefused = Extract<PlaceOrderResult, { ok: false }>;

export type PlaceOrderClient = {
	variant: {
		findMany(args: {
			where: { id: { in: string[] } };
			select: typeof CATALOGUE_VARIANT_SELECT;
		}): Promise<readonly CatalogueVariantRow[]>;
	};
	order: OrderNumberClient["order"];
};

export type PlaceOrderDeps = {
	client: PlaceOrderClient;
	year: () => number;
};

type RequestedLine = { variantId: string; quantity: number };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function refused(code: PlaceOrderRefusal, message?: string): PlaceOrderResult {
	return { ok: false, code, message: message ?? PLACE_ORDER_MESSAGES[code] };
}

function readBuyer(value: unknown): OrderBuyer {
	const source = isRecord(value) ? value : {};
	const buyer = {} as OrderBuyer;

	for (const field of BUYER_FIELDS) {
		const raw = source[field];

		buyer[field] = typeof raw === "string" ? raw : "";
	}

	return normalizeBuyer(buyer);
}

function readPayment(value: unknown): OrderPayment | null {
	return PAYMENTS.find((payment) => payment === value) ?? null;
}

function readQuantity(value: unknown): number {
	const quantity =
		typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 1;

	return Math.min(MAX_LINE_QUANTITY, Math.max(1, quantity));
}

function readLines(value: unknown): RequestedLine[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const quantities = new Map<string, number>();

	for (const entry of value.slice(0, MAX_LINES)) {
		if (!isRecord(entry)) {
			continue;
		}

		const variantId = entry.variantId;

		if (
			typeof variantId !== "string" ||
			variantId === "" ||
			variantId.length > MAX_ID_LENGTH
		) {
			continue;
		}

		quantities.set(
			variantId,
			Math.min(
				MAX_LINE_QUANTITY,
				(quantities.get(variantId) ?? 0) + readQuantity(entry.quantity),
			),
		);
	}

	return [...quantities].map(([variantId, quantity]) => ({ variantId, quantity }));
}

function provisionalLine(variant: CatalogVariant, quantity: number): CartLine {
	return {
		variantId: variant.variantId,
		sku: variant.sku,
		productSlug: variant.productSlug,
		productName: variant.productName,
		familyLabel: variant.familyLabel,
		variantLabel: variant.variantLabel,
		imageUrl: variant.imageUrl,
		imageAlt: variant.imageAlt,
		unitPriceCents: variant.unitPriceCents,
		quantity,
		available: true,
	};
}

function revalidatedLines(
	requested: readonly RequestedLine[],
	variants: readonly CatalogVariant[],
): CartLine[] {
	const byId = new Map(variants.map((variant) => [variant.variantId, variant]));

	const provisional = requested.flatMap(({ variantId, quantity }) => {
		const variant = byId.get(variantId);

		return variant === undefined ? [] : [provisionalLine(variant, quantity)];
	});

	const revalidated = applyRevalidation(
		{ lines: provisional, lastAddedVariantId: null },
		{ variants: [...variants], requested: requested.map((line) => line.variantId) },
	);

	return revalidated.lines.filter((line) => line.available);
}

function lineRows(lines: readonly CartLine[]): OrderLineCreateData[] {
	return lines.map((line) => ({
		productName: line.productName,
		productSlug: line.productSlug,
		familyLabel: line.familyLabel,
		variantSku: line.sku,
		variantLabel: line.variantLabel,
		quantity: line.quantity,
		unitPriceCents: line.unitPriceCents,
		imageUrl: line.imageUrl,
		imageAlt: line.imageAlt,
	}));
}

export async function placeOrder(
	input: PlaceOrderInput,
	deps: PlaceOrderDeps,
): Promise<PlaceOrderResult> {
	const requested = readLines(isRecord(input) ? input.lines : null);

	if (requested.length === 0) {
		return refused("CARRITO_VACIO");
	}

	const buyer = readBuyer(isRecord(input) ? input.buyer : null);
	const errors = validateBuyer(buyer);
	const firstError = BUYER_FIELDS.find((field) => errors[field] !== undefined);

	if (firstError !== undefined) {
		return {
			ok: false,
			code: "DATOS_INVALIDOS",
			message: errors[firstError] ?? PLACE_ORDER_MESSAGES.DATOS_INVALIDOS,
			errors,
		};
	}

	const payment = readPayment(isRecord(input) ? input.payment : null);

	if (payment === null) {
		return refused("DATOS_INVALIDOS");
	}

	const rows = await deps.client.variant.findMany({
		where: { id: { in: requested.map((line) => line.variantId) } },
		select: CATALOGUE_VARIANT_SELECT,
	});

	const variants = rows.map(toCatalogueVariant);
	const byId = new Map(variants.map((variant) => [variant.variantId, variant]));

	const unavailable = requested.some(({ variantId }) => {
		const variant = byId.get(variantId);

		return variant === undefined || variant.stock <= 0;
	});

	if (unavailable) {
		return refused("PRODUCTO_INEXISTENTE");
	}

	const lines = revalidatedLines(requested, variants);
	const totals = cartTotals({ lines, lastAddedVariantId: null });

	const data: Omit<OrderCreateData, "number"> = {
		status: "nuevo",
		payment,
		buyerName: buyer.name,
		buyerEmail: buyer.email,
		buyerPhone: buyer.phone,
		buyerAddress: buyer.address,
		buyerCity: buyer.city,
		buyerPostalCode: buyer.postalCode,
		totalCents: totals.totalCents,
		lines: { create: lineRows(lines) },
	};

	try {
		const created = await createWithOrderNumber(
			{ order: deps.client.order },
			data,
			deps.year(),
		);

		return { ok: true, id: created.id, number: created.number };
	} catch {
		return refused("PEDIDO_NO_CREADO");
	}
}
