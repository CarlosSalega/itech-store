import type { Metadata } from "next";

import { dashboardMetrics } from "@/features/admin/domain/metrics";
import { DASHBOARD_BASELINE } from "@/features/admin/fixtures/baseline";
import { listAdminOrders } from "@/features/admin/server/order-repository";
import { listAdminProducts } from "@/features/admin/server/product-repository";
import { AdminDashboard } from "@/features/admin/ui/dashboard";

export const metadata: Metadata = {
	title: "Panel — iTech Store",
	description:
		"El tablero del panel: lo vendido este mes, los pedidos a preparar, los productos publicados y el stock bajo.",
	robots: { index: false, follow: false },
};

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
