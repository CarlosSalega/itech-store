"use client";

import { usePathname } from "next/navigation";

import { isOpenOrder, type Order } from "@/features/checkout/domain/order";

import { activeDestination, activeProductLink } from "../domain/navigation";
import type { AdminProduct } from "../domain/product";
import { AdminNav } from "./admin-nav";

export function RouteNav({
	orders,
	products,
}: {
	orders: readonly Order[];
	products: readonly AdminProduct[];
}) {
	const pathname = usePathname();

	return (
		<AdminNav
			current={activeDestination(pathname)}
			currentProductHref={activeProductLink(pathname)}
			pendingOrders={orders.filter(isOpenOrder).length}
			productCount={products.length}
		/>
	);
}
