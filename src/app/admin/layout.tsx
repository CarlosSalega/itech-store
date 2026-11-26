import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { adminAccess } from "@/features/admin/domain/session";
import { listAdminOrders } from "@/features/admin/server/order-repository";
import { listAdminProducts } from "@/features/admin/server/product-repository";
import { AdminNav } from "@/features/admin/ui/admin-nav";
import { AdminShell } from "@/features/admin/ui/admin-shell";
import { RouteNav } from "@/features/admin/ui/route-nav";
import { isOpenOrder } from "@/features/checkout/domain/order";
import { getAuth } from "@/lib/auth";

import { signOut } from "./actions";

const ADMIN_PATH = "/admin";

export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
	const requestHeaders = await headers();
	const session = await getAuth().api.getSession({ headers: requestHeaders });
	const access = adminAccess(session?.user ?? null, ADMIN_PATH);

	if (!access.allowed) {
		redirect(access.loginHref);
	}

	const [orders, products] = await Promise.all([
		listAdminOrders(),
		listAdminProducts(),
	]);

	return (
		<AdminShell
			admin={access.admin}
			signOut={signOut}
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
					<RouteNav orders={orders} products={products} />
				</Suspense>
			}
		>
			{children}
		</AdminShell>
	);
}
