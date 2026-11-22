"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { ChevronRightIcon } from "@/components/icons";
import { cartLineTotal, lineContextLabel, type CartLine } from "@/features/cart/domain/cart";
import { PLACEHOLDER_IMAGE } from "@/features/catalog/domain/catalog";
import { formatArsPrice } from "@/features/catalog/domain/format-price";

import { orderPaymentLabel, type Order } from "../domain/order";
import {
	getOrdersServerSnapshot,
	getOrdersSnapshot,
	subscribeOrders,
} from "../storage/order-store";
import { CheckoutScreen } from "./screen";
import { useHydrated } from "./use-hydrated";

import screenStyles from "./screen.module.css";
import styles from "./receipt.module.css";

const PAYMENT_NEXT_STEP: Record<Order["payment"], string> = {
	transfer: "Coordinamos el pago: te pasamos los datos por email.",
	cash: "Coordinamos la entrega: pagás en efectivo cuando la recibís.",
};

export function OrderReceiptView({ codigo }: { codigo: string }) {
	const hydrated = useHydrated();
	const orders = useSyncExternalStore(
		subscribeOrders,
		getOrdersSnapshot,
		getOrdersServerSnapshot,
	);
	const order = orders.find((entry) => entry.number === codigo.trim().toUpperCase());

	if (!hydrated) {
		return (
			<div aria-busy="true" className={styles.pending}>
				<span className="sr-only">Buscando el pedido…</span>
			</div>
		);
	}

	if (order === undefined) {
		return <OrderMissing codigo={codigo} />;
	}

	return <OrderReceipt order={order} />;
}

function OrderReceipt({ order }: { order: Order }) {
	const headingRef = useRef<HTMLHeadingElement | null>(null);

	useEffect(() => {
		headingRef.current?.focus();
	}, []);

	return (
		<div className={styles.page}>
			<CheckoutScreen
				aside={
					<aside aria-labelledby="que-sigue" className={styles.next}>
						<h2 className={styles.nextTitle} id="que-sigue">
							Qué sigue
						</h2>
						<ol className={styles.nextList}>
							<li className={styles.nextItem}>
								<span>
									{PAYMENT_NEXT_STEP[order.payment]}
									<span className={styles.mail}>{order.buyer.email}</span>
								</span>
							</li>
							<li className={styles.nextItem}>
								El envío se coordina al finalizar: no sale del local hasta que
								hablemos.
							</li>
						</ol>
						<p className={styles.nextNote}>
							Pedido de demostración: no se cobró nada y no se envió ningún email.
						</p>
					</aside>
				}
				current="confirmacion"
			>
				<h1 className={styles.heading} ref={headingRef} tabIndex={-1}>
					Listo: el pedido quedó confirmado
				</h1>
				<p className={styles.lead}>Guardá el número para encontrarlo después.</p>

				<div className={styles.order}>
					<span className={styles.orderLabel}>Número de pedido</span>
					<strong className={styles.orderNumber}>{order.number}</strong>
				</div>

				<ul className={styles.bought}>
					{order.lines.map((line) => (
						<li className={styles.item} key={line.variantId}>
							<BoughtImage line={line} />
							<div>
								<Link
									className={styles.name}
									href={`/catalogo/${line.productSlug}`}
								>
									{line.productName}
								</Link>
								<p className={styles.context}>{lineContextLabel(line)}</p>
							</div>
							<span className={styles.amount}>
								{formatArsPrice(cartLineTotal(line))}
							</span>
						</li>
					))}
				</ul>

				<dl className={styles.totalRow}>
					<dt>Total</dt>
					<dd>{formatArsPrice(order.totals.totalCents)}</dd>
				</dl>
				<dl className={styles.paidRow}>
					<dt>Pago elegido</dt>
					<dd>{orderPaymentLabel(order.payment)}, a coordinar</dd>
				</dl>

				<div className={screenStyles.actions}>
					<Link className={screenStyles.primary} href="/catalogo">
						Seguir comprando
					</Link>
					<Link className={screenStyles.back} href="/contacto">
						¿Algo no cierra? Escribinos
						<ChevronRightIcon className={screenStyles.forwardIcon} />
					</Link>
				</div>
			</CheckoutScreen>
		</div>
	);
}

function BoughtImage({ line }: { line: CartLine }) {
	return (
		<figure className={styles.media}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				alt={line.imageUrl === null ? "" : line.imageAlt}
				decoding="async"
				height={640}
				src={line.imageUrl ?? PLACEHOLDER_IMAGE}
				width={640}
			/>
		</figure>
	);
}

function OrderMissing({ codigo }: { codigo: string }) {
	return (
		<div className={styles.missing}>
			<h1 className={styles.missingTitle}>No encontramos ese pedido</h1>
			<p className={styles.missingCopy}>
				El código «{codigo}» no está entre los pedidos guardados en este navegador: los
				pedidos de esta demostración viven en el navegador donde se hicieron.
			</p>
			<div className={screenStyles.actions}>
				<Link className={screenStyles.primary} href="/catalogo">
					Ver el catálogo
				</Link>
				<Link className={screenStyles.back} href="/finalizar-compra">
					Empezar una compra
					<ChevronRightIcon className={screenStyles.forwardIcon} />
				</Link>
			</div>
		</div>
	);
}
