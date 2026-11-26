import { Fragment } from "react";

import {
	cartCountLabel,
	cartLineTotal,
	type CartLine,
} from "@/features/cart/domain/cart";
import { PLACEHOLDER_IMAGE } from "@/features/catalog/domain/catalog";
import { formatArsPrice } from "@/features/catalog/domain/format-price";
import {
	ORDER_STATUSES,
	orderPaymentLabel,
	type Order,
	type OrderStatus,
} from "@/features/checkout/domain/order";

import { orderDateLabel } from "../domain/metrics";
import {
	orderFullDateLabel,
	orderStatusTone,
	type OrderTone,
} from "../domain/order-inbox";
import { ChevronDownIcon } from "./icons";
import { Money } from "./money";

import styles from "./orders.module.css";

const TONE_CLASS: Record<OrderTone, string> = {
	ink: styles.statusInk,
	warning: styles.statusWarning,
	muted: styles.statusMuted,
	success: styles.statusSuccess,
	danger: styles.statusDanger,
};

type OrdersTableProps = {
	orders: readonly Order[];
	expanded: string | null;
	onToggle: (number: string) => void;
	onStatusChange: (number: string, status: OrderStatus) => void;
};

export function OrdersTable({
	orders,
	expanded,
	onToggle,
	onStatusChange,
}: OrdersTableProps) {
	return (
		<table className={styles.orders} role="table">
			<caption className="sr-only">
				Los pedidos de la tienda, del más nuevo al más viejo, con su comprador, su
				fecha, su total, su estado editable y el detalle de sus líneas.
			</caption>
			<thead role="rowgroup">
				<tr role="row">
					<th className={styles.pad} role="columnheader" scope="col">
						Pedido
					</th>
					<th className={styles.pad} role="columnheader" scope="col">
						Comprador
					</th>
					<th className={`${styles.pad} ${styles.dateCell}`} role="columnheader" scope="col">
						Fecha
					</th>
					<th className={`${styles.num} ${styles.pad}`} role="columnheader" scope="col">
						Total
					</th>
					<th role="columnheader" scope="col">
						Estado
					</th>
					<th role="columnheader" scope="col">
						<span className="sr-only">Detalle</span>
					</th>
				</tr>
			</thead>
			<tbody role="rowgroup">
				{orders.map((order) => {
					const isOpen = expanded === order.number;
					const detailId = `detalle-${order.number}`;

					return (
						<Fragment key={order.number}>
							<tr className={styles.row} role="row">
								<td className={styles.pad} role="cell">
									<span className={styles.orderNumber}>{order.number}</span>
								</td>
								<td className={styles.pad} role="cell">
									<span className={styles.buyer}>{order.buyer.name}</span>
									<span className={styles.city}>{order.buyer.city}</span>
								</td>
								<td className={`${styles.pad} ${styles.dateCell}`} role="cell">
									<span className={styles.cellLabel} aria-hidden="true">
										Pedido del
									</span>
									<span className={styles.date}>
										{orderDateLabel(order.createdAt)}
									</span>
								</td>
								<td className={`${styles.num} ${styles.pad}`} role="cell">
									<span className={styles.cellLabel} aria-hidden="true">
										Total
									</span>
									<Money cents={order.totals.totalCents} className={styles.amount} />
								</td>
								<td role="cell">
									<span className={styles.statusWrap}>
										<label className="sr-only" htmlFor={`estado-${order.number}`}>
											{`Estado del pedido ${order.number}`}
										</label>
										<select
											className={`${styles.statusSelect} ${
												TONE_CLASS[orderStatusTone(order.status)]
											}`}
											id={`estado-${order.number}`}
											onChange={(event) =>
												onStatusChange(
													order.number,
													event.target.value as OrderStatus,
												)
											}
											value={order.status}
										>
											{ORDER_STATUSES.map((status) => (
												<option key={status} value={status}>
													{status}
												</option>
											))}
										</select>
										<ChevronDownIcon className={styles.statusChevron} />
									</span>
								</td>
								<td role="cell">
									<button
										aria-controls={detailId}
										aria-expanded={isOpen}
										className={styles.expand}
										onClick={() => onToggle(order.number)}
										type="button"
									>
										<ChevronDownIcon className={styles.expandIcon} />
										<span className="sr-only">
											{isOpen
												? `Cerrar el detalle de ${order.number}`
												: `Abrir el detalle de ${order.number}`}
										</span>
									</button>
								</td>
							</tr>

							{isOpen ? (
								<tr className={styles.detailRow} id={detailId} role="row">
									<td className={styles.detailCell} colSpan={6} role="cell">
										<OrderDetail order={order} />
									</td>
								</tr>
							) : null}
						</Fragment>
					);
				})}
			</tbody>
		</table>
	);
}

function OrderDetail({ order }: { order: Order }) {
	return (
		<div className={styles.detail}>
			<div className={styles.detailHead}>
				<h2 className={styles.detailTitle}>
					{`${order.number} · ${order.buyer.name}`}
				</h2>
				<p className={styles.detailMeta}>
					{`${orderFullDateLabel(order.createdAt)} · ${cartCountLabel(order.totals)}`}
				</p>
			</div>

			<ul className={styles.lines}>
				{order.lines.map((line) => (
					<li className={styles.line} key={line.variantId}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							alt=""
							className={styles.linePhoto}
							height={36}
							src={line.imageUrl ?? PLACEHOLDER_IMAGE}
							width={36}
						/>
						<span>
							<span className={styles.lineName}>{line.productName}</span>
							<span className={styles.lineMeta}>{lineMeta(line)}</span>
						</span>
						<span className={styles.lineAmount}>
							{formatArsPrice(cartLineTotal(line))}
						</span>
					</li>
				))}
			</ul>

			<div className={styles.detailFoot}>
				<div className={styles.facts}>
					<span>{`Pago: ${orderPaymentLabel(order.payment)}`}</span>
					<span>Envío: se coordina al finalizar</span>
					<span>
						{`Entrega: ${order.buyer.address}, ${order.buyer.city} (${order.buyer.postalCode})`}
					</span>
				</div>
				<dl className={styles.total}>
					<dt>Total del pedido</dt>
					<dd>
						<Money cents={order.totals.totalCents} className={styles.totalAmount} />
					</dd>
				</dl>
			</div>
		</div>
	);
}

function lineMeta(line: CartLine): string {
	const context = line.variantLabel ?? "sin capacidad";

	return `${context} · ${line.quantity} × ${formatArsPrice(line.unitPriceCents)}`;
}
