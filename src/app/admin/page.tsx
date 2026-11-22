import { dashboardMetrics } from "@/features/admin/domain/metrics";
import { DASHBOARD_BASELINE } from "@/features/admin/fixtures/baseline";
import { listAdminOrders } from "@/features/admin/server/order-repository";
import { listAdminProducts } from "@/features/admin/server/product-repository";
import { AdminDashboard } from "@/features/admin/ui/dashboard";

export default async function AdminPanelPage() {
	const [orders, products] = await Promise.all([
		listAdminOrders(),
		listAdminProducts(),
	]);

	const metrics = dashboardMetrics({
		orders,
		products,
		baseline: DASHBOARD_BASELINE,
	});

	return <AdminDashboard metrics={metrics} />;
}
