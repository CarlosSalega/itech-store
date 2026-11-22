"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import type { Order, OrderStatus } from "@/features/checkout/domain/order";
import {
	commitOrders,
	getOrdersSnapshot,
	subscribeOrders,
} from "@/features/checkout/storage/order-store";

import {
	DEFAULT_ORDER_FILTERS,
	filterOrders,
	orderFilterHref,
	orderFiltersFromParams,
	orderStatusCounts,
	updateOrderStatus,
	type OrderFilters,
} from "../domain/order-inbox";
import { OrdersInboxView } from "./orders-inbox-view";

export function OrdersInbox({ initialOrders }: { initialOrders: readonly Order[] }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const orders = useSyncExternalStore(
		subscribeOrders,
		getOrdersSnapshot,
		() => initialOrders,
	);
	const urlFilters = orderFiltersFromParams(
		Object.fromEntries(searchParams.entries()),
	);
	const urlHref = orderFilterHref(urlFilters);
	const [view, setView] = useState({ filters: urlFilters, href: urlHref });
	const [expanded, setExpanded] = useState<string | null>(null);

	if (view.href !== urlHref) {
		setView({ filters: urlFilters, href: urlHref });
	}

	const filters = view.filters;

	const apply = (next: OrderFilters) => {
		const href = orderFilterHref(next);

		setView({ filters: next, href });
		router.replace(href, { scroll: false });
	};

	const changeStatus = (number: string, status: OrderStatus) => {
		commitOrders(updateOrderStatus(orders, number, status));
	};

	return (
		<OrdersInboxView
			counts={orderStatusCounts(orders)}
			expanded={expanded}
			filters={filters}
			onClear={() => apply(DEFAULT_ORDER_FILTERS)}
			onOrderStatus={changeStatus}
			onQueryChange={(query) => apply({ ...filters, query })}
			onStatusFilter={(status) => apply({ ...filters, status })}
			onToggleOrder={(number) =>
				setExpanded((current) => (current === number ? null : number))
			}
			orders={orders}
			visible={filterOrders(orders, filters)}
		/>
	);
}
