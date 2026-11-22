import type { Order } from "@/features/checkout/domain/order";
import { FIXTURE_ORDERS } from "@/features/checkout/fixtures/orders";

export async function listAdminOrders(): Promise<readonly Order[]> {
	return FIXTURE_ORDERS;
}
