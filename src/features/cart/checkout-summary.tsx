"use client";

import Link from "next/link";

import { formatArsPrice } from "@/features/catalog/format-price";

import { cartLineTotal, variantLabelOf } from "./cart";
import { useCart } from "./cart-provider";

import styles from "@/app/finalizar-compra/finalizar-compra.module.css";

/**
 * What the visitor was about to buy, on the placeholder checkout route (§S11).
 *
 * It is a client component because the cart lives in the browser: the server
 * cannot know what this session holds. The prices shown here are the stored
 * snapshot, and the copy says so instead of implying a quoted total.
 */
export function CheckoutSummary() {
	const { cart, totals } = useCart();

	if (cart.lines.length === 0) {
		return (
			<div className={styles.empty}>
				<p className={styles.emptyTitle}>Tu carrito está vacío</p>
				<p className={styles.emptyCopy}>
					Agregá un producto del catálogo y volvé a esta pantalla para coordinarlo.
				</p>
				<Link className={styles.emptyLink} href="/catalogo">
					Ver el catálogo
				</Link>
			</div>
		);
	}

	return (
		<div className={styles.summary}>
			<h2 className={styles.summaryTitle}>Lo que ibas a comprar</h2>

			<ul className={styles.lines}>
				{cart.lines.map((line) => (
					<li className={styles.line} key={line.variantId}>
						<span className={styles.lineName}>{line.productName}</span>
						<span className={styles.lineMeta}>
							{variantLabelOf(line)} · {line.quantity}{" "}
							{line.quantity === 1 ? "unidad" : "unidades"}
						</span>
						<span className={styles.lineTotal}>
							{formatArsPrice(cartLineTotal(line))}
						</span>
					</li>
				))}
			</ul>

			<dl className={styles.totals}>
				<dt>Total de referencia</dt>
				<dd>{formatArsPrice(totals.totalCents)}</dd>
			</dl>

			<p className={styles.note}>
				Los precios son de ejemplo y todavía no son un precio de venta: se
				confirman al coordinar la compra.
			</p>
		</div>
	);
}
