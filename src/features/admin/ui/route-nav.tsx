"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { isOpenOrder, type Order } from "@/features/checkout/domain/order";
import {
	getOrdersSnapshot,
	subscribeOrders,
} from "@/features/checkout/storage/order-store";

import { activeDestination, activeProductLink } from "../domain/navigation";
import type { AdminProduct } from "../domain/product";
import {
	getProductsSnapshot,
	subscribeProducts,
} from "../storage/product-store";
import { AdminNav } from "./admin-nav";

export function RouteNav({
	initialOrders,
	initialProducts,
}: {
	initialOrders: readonly Order[];
	initialProducts: readonly AdminProduct[];
}) {
	const pathname = usePathname();
	const orders = useSyncExternalStore(
		subscribeOrders,
		getOrdersSnapshot,
		() => initialOrders,
	);
	const products = useSyncExternalStore(
		subscribeProducts,
		getProductsSnapshot,
		() => initialProducts,
	);

	return (
		<AdminNav
			current={activeDestination(pathname)}
			currentProductHref={activeProductLink(pathname)}
			pendingOrders={orders.filter(isOpenOrder).length}
			productCount={products.length}
		/>
	);
}
