import { Suspense } from "react";

import { updateOrderStatusAction } from "@/features/admin/server/actions";
import { listAdminOrders } from "@/features/admin/server/order-repository";
import { OrdersInbox } from "@/features/admin/ui/orders-inbox";
import { ScreenPending } from "@/features/admin/ui/screen";

export const instant = false;

export default async function AdminPedidosPage() {
	const orders = await listAdminOrders();

	return (
		<Suspense fallback={<ScreenPending label="Cargando los pedidos…" />}>
			<OrdersInbox changeStatus={updateOrderStatusAction} initialOrders={orders} />
		</Suspense>
	);
}
