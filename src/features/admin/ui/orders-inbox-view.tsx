import type { CSSProperties } from "react";

import { SearchIcon } from "@/components/icons";
import { formatArsPrice } from "@/features/catalog/domain/format-price";
import {
	CANCELLED_ORDER_STATUS,
	isOpenOrder,
	type Order,
	type OrderStatus,
} from "@/features/checkout/domain/order";

import {
	ORDER_FILTER_LABEL,
	ORDER_STATUS_FILTERS,
	type OrderFilters,
	type OrderStatusFilter,
} from "../domain/order-inbox";
import { OrdersTable } from "./orders-table";
import { AdminScreen, ScreenFoot } from "./screen";

import styles from "./orders.module.css";

type OrdersInboxViewProps = {
	orders: readonly Order[];
	visible: readonly Order[];
	filters: OrderFilters;
	expanded: string | null;
	counts: Record<OrderStatusFilter, number>;
	onQueryChange: (query: string) => void;
	onStatusFilter: (status: OrderStatusFilter) => void;
	onClear: () => void;
	onToggleOrder: (number: string) => void;
	onOrderStatus: (number: string, status: OrderStatus) => void;
};

function delay(index: number) {
	return { "--i": index } as CSSProperties;
}

function orderCount(count: number): string {
	return count === 1 ? "1 pedido" : `${count} pedidos`;
}

function collectedLabel(cancelled: number): string {
	if (cancelled === 0) {
		return "cobrados";
	}

	return cancelled === 1
		? "cobrados sin el pedido cancelado"
		: `cobrados sin los ${cancelled} pedidos cancelados`;
}

function inboxSummary(orders: readonly Order[], shown: number): string {
	const paid = orders.filter((order) => order.status !== CANCELLED_ORDER_STATUS);
	const collected = paid.reduce((sum, order) => sum + order.totals.totalCents, 0);
	const total = orders.reduce((sum, order) => sum + order.totals.totalCents, 0);
	const open = orders.filter(isOpenOrder).length;
	const label =
		shown === orders.length
			? orderCount(orders.length)
			: `Mostrando ${shown} de los ${orders.length} pedidos`;

	return `${label} · ${formatArsPrice(total)} en total · ${open} a preparar · ${formatArsPrice(
		collected,
	)} ${collectedLabel(orders.length - paid.length)}.`;
}

export function OrdersInboxView({
	orders,
	visible,
	filters,
	expanded,
	counts,
	onQueryChange,
	onStatusFilter,
	onClear,
	onToggleOrder,
	onOrderStatus,
}: OrdersInboxViewProps) {
	return (
		<AdminScreen>
			<div className={`${styles.head} ${styles.enter}`}>
				<div>
					<h1 className={styles.title}>Pedidos</h1>
					<p className={styles.deck}>
						{`${orders.length} pedidos de la demo, del más nuevo al más viejo.`}
					</p>
				</div>
			</div>

			<div className={`${styles.toolbar} ${styles.enter}`} style={delay(1)}>
				<div aria-label="Filtrar por estado" className={styles.chips} role="group">
					{ORDER_STATUS_FILTERS.map((status) => (
						<button
							aria-pressed={filters.status === status}
							className={styles.chip}
							key={status}
							onClick={() => onStatusFilter(status)}
							type="button"
						>
							{ORDER_FILTER_LABEL[status]}
							<span className={styles.count}>{counts[status]}</span>
						</button>
					))}
				</div>

				<div className={styles.searchField}>
					<SearchIcon className={styles.searchIcon} />
					<label className="sr-only" htmlFor="pedidos-q">
						Buscar pedidos por número o comprador
					</label>
					<input
						id="pedidos-q"
						onChange={(event) => onQueryChange(event.target.value)}
						placeholder="Buscar por número o comprador"
						type="search"
						value={filters.query}
					/>
				</div>
			</div>

			<div className={`${styles.tableWrap} ${styles.enter}`} style={delay(2)}>
				<OrdersTable
					expanded={expanded}
					onStatusChange={onOrderStatus}
					onToggle={onToggleOrder}
					orders={visible}
				/>

				{visible.length === 0 ? <EmptyInbox onClear={onClear} /> : null}

				<p className={styles.tableFoot}>{inboxSummary(orders, visible.length)}</p>
			</div>

			<ScreenFoot
				notice={`Los datos de este panel son de ejemplo: ${orderCount(
					orders.length,
				)} de la demo, con sus compradores, sus totales y sus estados. Los cambios de estado se guardan en este navegador. Los precios son de muestra y no son precios de venta.`}
				routes="/admin/pedidos · /pedido/[codigo]"
			/>
		</AdminScreen>
	);
}

function EmptyInbox({ onClear }: { onClear: () => void }) {
	return (
		<div className={styles.empty}>
			<span aria-hidden="true" className={styles.emptyIcon}>
				<SearchIcon className={styles.emptyGlyph} />
			</span>
			<span className={styles.emptyText}>
				<span className={styles.emptyTitle}>Ningún pedido coincide.</span>
				<span className={styles.emptyNote}>
					No hay pedidos con ese número ni con ese comprador. Probá con otro texto o
					volvé a todos los estados.
				</span>
			</span>
			<button className={styles.clear} onClick={onClear} type="button">
				Limpiar los filtros
			</button>
		</div>
	);
}
