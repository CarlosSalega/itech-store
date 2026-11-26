import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { formatArsPrice } from "@/features/catalog/domain/format-price";
import { orderPaymentLabel } from "@/features/checkout/domain/order";
import { listMyOrders } from "@/features/account/server/actions";
import { MagicLinkForm } from "@/features/account/ui/magic-link-form";

import styles from "./mis-pedidos.module.css";

export const instant = false;

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(iso));
}

export default async function MisPedidosPage() {
	const session = await getAuth()
		.api.getSession({ headers: await headers() })
		.catch(() => null);

	if (session === null) {
		return (
			<main className={styles.page} id="main">
				<h1 className={styles.title}>Mis pedidos</h1>
				<p className={styles.deck}>
					Dejanos tu email y te mandamos un enlace para entrar: sin contraseña y
					vence a los 15 minutos.
				</p>
				<MagicLinkForm />
			</main>
		);
	}

	const result = await listMyOrders();

	if (!result.ok) {
		return (
			<main className={styles.page} id="main">
				<h1 className={styles.title}>Mis pedidos</h1>
				<p aria-live="polite" className={styles.deck} role="status">
					No pudimos leer tus pedidos en este momento. Recargá la página en un rato.
				</p>
			</main>
		);
	}

	if (result.orders.length === 0) {
		return (
			<main className={styles.page} id="main">
				<h1 className={styles.title}>Mis pedidos</h1>
				<p className={styles.deck}>
					Todavía no hay pedidos con este email. Cuando compres, van a aparecer acá.
				</p>
			</main>
		);
	}

	return (
		<main className={styles.page} id="main">
			<h1 className={styles.title}>Mis pedidos</h1>
			<ol className={styles.orders}>
				{result.orders.map((order) => (
					<li className={styles.order} key={order.number}>
						<div className={styles.orderHead}>
							<span className={styles.number}>{order.number}</span>
							<span className={styles.status}>{order.status}</span>
							<span className={styles.date}>{formatDate(order.createdAt)}</span>
						</div>
						<ul className={styles.lines}>
							{order.lines.map((line) => (
								<li className={styles.line} key={`${order.number}-${line.sku}`}>
									<span className={styles.lineName}>
										{line.productName}
										{line.variantLabel === null ? "" : ` · ${line.variantLabel}`}
									</span>
									<span className={styles.lineQty}>
										{line.quantity} × {formatArsPrice(line.unitPriceCents)}
									</span>
								</li>
							))}
						</ul>
						<p className={styles.total}>
							Total: {formatArsPrice(order.totals.totalCents)} · pago:{" "}
							{orderPaymentLabel(order.payment)}
						</p>
					</li>
				))}
			</ol>
		</main>
	);
}
