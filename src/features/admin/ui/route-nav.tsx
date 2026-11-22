"use client";

import { usePathname } from "next/navigation";

import { activeDestination } from "../domain/navigation";
import { AdminNav } from "./admin-nav";

export function RouteNav({
	pendingOrders,
	productCount,
}: {
	pendingOrders: number;
	productCount: number;
}) {
	const pathname = usePathname();

	return (
		<AdminNav
			current={activeDestination(pathname)}
			pendingOrders={pendingOrders}
			productCount={productCount}
		/>
	);
}
