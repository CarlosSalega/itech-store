"use client";

import { useSyncExternalStore } from "react";

import type { Order } from "@/features/checkout/domain/order";
import {
	getOrdersSnapshot,
	subscribeOrders,
} from "@/features/checkout/storage/order-store";

import { dashboardMetrics } from "../domain/metrics";
import type { AdminProduct } from "../domain/product";
import { DASHBOARD_BASELINE } from "../fixtures/baseline";
import {
	getProductsSnapshot,
	subscribeProducts,
} from "../storage/product-store";
import { AdminDashboard } from "./dashboard";

export function DashboardLive({
	initialOrders,
	initialProducts,
}: {
	initialOrders: readonly Order[];
	initialProducts: readonly AdminProduct[];
}) {
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
		<AdminDashboard
			metrics={dashboardMetrics({
				orders,
				products,
				baseline: DASHBOARD_BASELINE,
			})}
		/>
	);
}
