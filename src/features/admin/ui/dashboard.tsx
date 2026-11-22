import Link from "next/link";
import type { CSSProperties } from "react";

import { ChevronRightIcon } from "@/components/icons";
import {
	FAMILY_LABEL,
	PLACEHOLDER_IMAGE,
} from "@/features/catalog/domain/catalog";
import { formatArsPrice } from "@/features/catalog/domain/format-price";
import type { OrderStatus } from "@/features/checkout/domain/order";

import {
	orderDateLabel,
	type DashboardDelta,
	type DashboardMetrics,
} from "../domain/metrics";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";

import styles from "./dashboard.module.css";

const CHIP_CLASS: Record<OrderStatus, string> = {
	nuevo: styles.chipNew,
	"en preparación": styles.chip,
	enviado: styles.chip,
	entregado: styles.chipDone,
	cancelado: styles.chipCancel,
};

function Money({ cents, className }: { cents: number; className?: string }) {
	const [currency, amount] = formatArsPrice(cents).split(" ");

	return (
		<span className={className}>
			<span className={styles.currency}>{currency}</span> {amount}
		</span>
	);
}

function Delta({ delta }: { delta: DashboardDelta }) {
	const Icon =
		delta.direction === "up"
			? ArrowUpIcon
			: delta.direction === "down"
				? ArrowDownIcon
				: null;
	const tone =
		delta.tone === "good"
			? styles.deltaGood
			: delta.tone === "attention"
				? styles.deltaAttention
				: null;

	return (
		<p className={tone === null ? styles.delta : `${styles.delta} ${tone}`}>
			<span className={styles.deltaLine}>
				{Icon === null ? null : <Icon className={styles.deltaIcon} />}
				<strong>{delta.label}</strong>
			</span>
			<span className={styles.deltaBase}>{delta.base}</span>
		</p>
	);
}

export function AdminDashboard({ metrics }: { metrics: DashboardMetrics }) {
	const period = metrics.periodLabel.toLowerCase();
	const cancelled =
		metrics.orders.cancelledCount === 1
			? "uno cancelado"
			: `${metrics.orders.cancelledCount} cancelados`;

	return (
		<div className={styles.page}>
			<div className={`${styles.head} ${styles.enter}`}>
				<div>
					<h1 className={styles.title}>Panel</h1>
					<p className={styles.pageDeck}>
						Lo que se vendió este mes, lo que falta despachar y lo que hay que
						reponer.
					</p>
				</div>
				<div className={styles.actions}>
					<span className={styles.period}>{metrics.periodLabel}</span>
					<Link className={styles.primary} href="/admin/productos/nuevo">
						Nuevo producto
					</Link>
				</div>
			</div>

			<ul
				className={`${styles.metrics} ${styles.enter}`}
				style={{ "--i": 1 } as CSSProperties}
			>
				<li className={styles.lead}>
					<p className={styles.metricLabel}>Vendido este mes</p>
					<Money cents={metrics.sold.cents} className={styles.leadValue} />
					<Delta delta={metrics.sold.delta} />
				</li>
				<li className={styles.metric}>
					<p className={styles.metricLabel}>Pedidos a preparar</p>
					<p className={styles.value}>{metrics.toFulfil.count}</p>
					<Delta delta={metrics.toFulfil.delta} />
				</li>
				<li className={styles.metric}>
					<p className={styles.metricLabel}>Productos publicados</p>
					<p className={styles.value}>{metrics.published.count}</p>
					<Delta delta={metrics.published.delta} />
				</li>
				<li className={styles.metric}>
					<p className={styles.metricLabel}>Productos con stock bajo</p>
					<p className={styles.value}>{metrics.lowStock.count}</p>
					<Delta delta={metrics.lowStock.delta} />
				</li>
			</ul>

			<div
				className={`${styles.blocks} ${styles.enter}`}
				style={{ "--i": 2 } as CSSProperties}
			>
				<section aria-labelledby="pedidos-recientes">
					<div className={styles.sectionHead}>
						<div>
							<h2 className={styles.sectionTitle} id="pedidos-recientes">
								Pedidos recientes
							</h2>
							<p className={styles.sectionDeck}>
								Los {metrics.orders.count} pedidos de {period}, del más nuevo al
								más viejo.
							</p>
						</div>
						<Link className={styles.sectionLink} href="/admin/pedidos">
							Ver todos
							<ChevronRightIcon />
						</Link>
					</div>

					<div className={styles.scroller}>
						<table className={styles.orders}>
							<caption className="sr-only">
								Pedidos de {period}, con comprador, fecha, total y estado.
							</caption>
							<thead>
								<tr>
									<th className={styles.pad} scope="col">
										Pedido
									</th>
									<th className={styles.pad} scope="col">
										Comprador
									</th>
									<th className={`${styles.pad} ${styles.dateCell}`} scope="col">
										Fecha
									</th>
									<th className={`${styles.num} ${styles.pad}`} scope="col">
										Total
									</th>
									<th scope="col">Estado</th>
								</tr>
							</thead>
							<tbody>
								{metrics.orders.recent.map((order) => (
									<tr key={order.number}>
										<td className={styles.pad}>
											<span className={styles.orderNumber}>{order.number}</span>
										</td>
										<td className={styles.pad}>
											<span className={styles.buyer}>{order.buyer.name}</span>
											<span className={styles.city}>{order.buyer.city}</span>
										</td>
										<td className={`${styles.pad} ${styles.dateCell}`}>
											<span className={styles.date}>
												{orderDateLabel(order.createdAt)}
											</span>
										</td>
										<td className={`${styles.num} ${styles.pad}`}>
											<Money
												cents={order.totals.totalCents}
												className={styles.amount}
											/>
										</td>
										<td>
											<span className={CHIP_CLASS[order.status]}>
												{order.status}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<p className={styles.tableFoot}>
						{metrics.orders.count} pedidos: {metrics.sold.orders} cobrados por{" "}
						{formatArsPrice(metrics.sold.cents)} y {cancelled} por{" "}
						{formatArsPrice(metrics.orders.cancelledCents)}.
					</p>
				</section>

				<section aria-labelledby="stock-bajo">
					<div className={styles.sectionHead}>
						<div>
							<h2 className={styles.sectionTitle} id="stock-bajo">
								Stock bajo
							</h2>
							<p className={styles.sectionDeck}>
								{metrics.lowStock.count} productos con alguna variante en{" "}
								{metrics.lowStock.threshold} unidades o menos.
							</p>
						</div>
						<Link className={styles.sectionLink} href="/admin/productos?stock=bajo">
							Ver todos
							<ChevronRightIcon />
						</Link>
					</div>

					<ul className={styles.stock}>
						{metrics.lowStock.products.map(({ product, variant, units }) => (
							<li className={styles.stockRow} key={product.slug}>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									alt=""
									className={styles.photo}
									height={52}
									src={product.image ?? PLACEHOLDER_IMAGE}
									width={52}
								/>
								<span>
									<Link
										className={styles.stockName}
										href={`/admin/productos/${product.slug}`}
									>
										{product.name}
									</Link>
									<span className={styles.stockMeta}>
										{FAMILY_LABEL[product.category]} ·{" "}
										{variant.label ?? "sin capacidad"}
									</span>
								</span>
								<span className={styles.units}>
									{units} u.<span className={styles.unitsLabel}>en stock</span>
								</span>
							</li>
						))}
					</ul>
				</section>
			</div>

			<footer className={styles.foot}>
				<span aria-hidden="true" className={styles.footRule} />
				<p className={styles.notice}>
					Los datos de este panel son de ejemplo: {metrics.productCount} productos
					del catálogo de la tienda y los {metrics.orders.count} pedidos de la
					demo. Los precios son de muestra y no son precios de venta.
				</p>
			</footer>
		</div>
	);
}
