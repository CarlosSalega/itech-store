import type { Order } from "@/features/checkout/domain/order";
import {
	RECEIPT_ORDER_SELECT,
	toReceiptOrder,
	type ReceiptOrderRow,
} from "@/features/checkout/server/order-receipt";

export type AdminOrderRow = ReceiptOrderRow;

export type AdminOrderClient = {
	order: {
		findMany(args: {
			select: typeof RECEIPT_ORDER_SELECT;
			orderBy: { createdAt: "desc" };
		}): Promise<readonly AdminOrderRow[]>;
	};
};

export function toAdminOrder(row: AdminOrderRow): Order {
	return toReceiptOrder(row);
}

let defaultClient: AdminOrderClient | undefined;

async function client(): Promise<AdminOrderClient> {
	if (defaultClient !== undefined) {
		return defaultClient;
	}

	const { prisma } = await import("@/lib/prisma");

	defaultClient = { order: prisma.order };

	return defaultClient;
}

export async function listAdminOrders(
	source?: AdminOrderClient,
): Promise<readonly Order[]> {
	const rows = await (source ?? (await client())).order.findMany({
		select: RECEIPT_ORDER_SELECT,
		orderBy: { createdAt: "desc" },
	});

	return rows.map(toAdminOrder);
}
