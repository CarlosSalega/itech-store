"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import type { Order, OrderStatus } from "@/features/checkout/domain/order";

import {
	DEFAULT_ORDER_FILTERS,
	filterOrders,
	orderFilterHref,
	orderFiltersFromParams,
	orderStatusCounts,
	updateOrderStatus,
	type OrderFilters,
} from "../domain/order-inbox";
import type { AdminOrderActionResult } from "../server/order-actions";
import { OrdersInboxView } from "./orders-inbox-view";
import { UNREACHABLE_MESSAGE } from "./screen-actions";

export type OrderStatusAction = (
	number: string,
	status: string,
) => Promise<AdminOrderActionResult>;

export function inboxMessage(result: AdminOrderActionResult): string | null {
	return result.ok ? null : result.message;
}

export function OrdersInbox({
	initialOrders,
	changeStatus,
}: {
	initialOrders: readonly Order[];
	changeStatus: OrderStatusAction;
}) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [orders, setOrders] = useState(initialOrders);
	const [synced, setSynced] = useState(initialOrders);
	const [message, setMessage] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const urlFilters = orderFiltersFromParams(
		Object.fromEntries(searchParams.entries()),
	);
	const urlHref = orderFilterHref(urlFilters);
	const [view, setView] = useState({ filters: urlFilters, href: urlHref });
	const [expanded, setExpanded] = useState<string | null>(null);

	if (synced !== initialOrders) {
		setSynced(initialOrders);
		setOrders(initialOrders);
	}

	if (view.href !== urlHref) {
		setView({ filters: urlFilters, href: urlHref });
	}

	const filters = view.filters;

	const apply = (next: OrderFilters) => {
		const href = orderFilterHref(next);

		setView({ filters: next, href });
		router.replace(href, { scroll: false });
	};

	const submit = (number: string, status: OrderStatus) => {
		if (pending) {
			return;
		}

		setPending(true);
		setMessage(null);

		void (async () => {
			const result = await changeStatus(number, status).catch(() => null);

			setPending(false);
			setMessage(result === null ? UNREACHABLE_MESSAGE : inboxMessage(result));

			if (result?.ok) {
				setOrders((current) => updateOrderStatus(current, number, status));
			}
		})();
	};

	return (
		<OrdersInboxView
			counts={orderStatusCounts(orders)}
			expanded={expanded}
			filters={filters}
			message={message}
			onClear={() => apply(DEFAULT_ORDER_FILTERS)}
			onOrderStatus={submit}
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
