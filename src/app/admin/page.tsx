import { dashboardMetrics } from "@/features/admin/domain/metrics";
import { DASHBOARD_BASELINE } from "@/features/admin/fixtures/baseline";
import { listAdminOrders } from "@/features/admin/server/order-repository";
import { listAdminProducts } from "@/features/admin/server/product-repository";
import { AdminDashboard } from "@/features/admin/ui/dashboard";

export const instant = false;

export async function loadDashboardMetrics() {
	const [orders, products] = await Promise.all([
		listAdminOrders(),
		listAdminProducts(),
	]);

	return {
		orders,
		products,
		metrics: dashboardMetrics({
			orders,
			products,
			baseline: DASHBOARD_BASELINE,
		}),
	};
}

export default async function AdminPanelPage() {
	const { metrics } = await loadDashboardMetrics();

	return <AdminDashboard metrics={metrics} />;
}
