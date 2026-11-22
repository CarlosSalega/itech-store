import { Suspense } from "react";

import { listAdminOrders } from "@/features/admin/server/order-repository";
import { listAdminProducts } from "@/features/admin/server/product-repository";
import { AdminNav } from "@/features/admin/ui/admin-nav";
import { AdminShell } from "@/features/admin/ui/admin-shell";
import { RouteNav } from "@/features/admin/ui/route-nav";
import { isOpenOrder } from "@/features/checkout/domain/order";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
	const [orders, products] = await Promise.all([
		listAdminOrders(),
		listAdminProducts(),
	]);

	return (
		<AdminShell
			nav={
				<Suspense
					fallback={
						<AdminNav
							current={null}
							pendingOrders={orders.filter(isOpenOrder).length}
							productCount={products.length}
						/>
					}
				>
					<RouteNav initialOrders={orders} initialProducts={products} />
				</Suspense>
			}
		>
			{children}
		</AdminShell>
	);
}
