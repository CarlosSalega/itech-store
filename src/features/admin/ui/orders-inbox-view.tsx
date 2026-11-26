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
	message: string | null;
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
	message,
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
						{`${orders.length} pedidos de la tienda, del más nuevo al más viejo.`}
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

				{visible.length === 0 ? (
					<EmptyInbox filtered={orders.length > 0} onClear={onClear} />
				) : null}

				<p aria-live="polite" className={styles.tableFoot} id="pedidos-message">
					{message}
				</p>

				<p className={styles.tableFoot}>{inboxSummary(orders, visible.length)}</p>
			</div>

			<ScreenFoot
				notice={`Los pedidos salen de la base de datos: ${orderCount(
					orders.length,
				)} con sus compradores, sus totales y sus estados. Los cambios de estado se guardan en la base de datos y el comprador los ve en el seguimiento de su pedido. Los precios son los precios de venta.`}
				routes="/admin/pedidos · /pedido/[codigo]"
			/>
		</AdminScreen>
	);
}

function EmptyInbox({
	filtered,
	onClear,
}: {
	filtered: boolean;
	onClear: () => void;
}) {
	return (
		<div className={styles.empty}>
			<span aria-hidden="true" className={styles.emptyIcon}>
				<SearchIcon className={styles.emptyGlyph} />
			</span>
			<span className={styles.emptyText}>
				<span className={styles.emptyTitle}>
					{filtered ? "Ningún pedido coincide." : "Todavía no hay pedidos."}
				</span>
				<span className={styles.emptyNote}>
					{filtered
						? "No hay pedidos con ese número ni con ese comprador. Probá con otro texto o volvé a todos los estados."
						: "Cuando alguien compre en la tienda, su pedido aparece acá con su comprador, su total y su estado."}
				</span>
			</span>
			{filtered ? (
				<button className={styles.clear} onClick={onClear} type="button">
					Limpiar los filtros
				</button>
			) : null}
		</div>
	);
}
