import { DashboardLive } from "@/features/admin/ui/dashboard-live";
import { listAdminOrders } from "@/features/admin/server/order-repository";
import { listAdminProducts } from "@/features/admin/server/product-repository";

export default async function AdminPanelPage() {
	const [orders, products] = await Promise.all([
		listAdminOrders(),
		listAdminProducts(),
	]);

	return <DashboardLive initialOrders={orders} initialProducts={products} />;
}
