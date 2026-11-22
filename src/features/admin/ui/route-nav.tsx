"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { activeDestination, activeProductLink } from "../domain/navigation";
import {
	getProductsServerSnapshot,
	getProductsSnapshot,
	subscribeProducts,
} from "../storage/product-store";
import { AdminNav } from "./admin-nav";

export function RouteNav({ pendingOrders }: { pendingOrders: number }) {
	const pathname = usePathname();
	const products = useSyncExternalStore(
		subscribeProducts,
		getProductsSnapshot,
		getProductsServerSnapshot,
	);

	return (
		<AdminNav
			current={activeDestination(pathname)}
			currentProductHref={activeProductLink(pathname)}
			pendingOrders={pendingOrders}
			productCount={products.length}
		/>
	);
}
