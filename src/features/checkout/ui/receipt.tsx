import Link from "next/link";

import { ChevronRightIcon } from "@/components/icons";
import {
	cartLineTotal,
	lineContextLabel,
	type CartLine,
} from "@/features/cart/domain/cart";
import { PLACEHOLDER_IMAGE } from "@/features/catalog/domain/catalog";
import { formatArsPrice } from "@/features/catalog/domain/format-price";

import {
	CANCELLED_ORDER_STATUS,
	orderPaymentLabel,
	type Order,
} from "../domain/order";
import { ReceiptHeading } from "./receipt-heading";
import { CheckoutScreen } from "./screen";

import screenStyles from "./screen.module.css";
import styles from "./receipt.module.css";

const PAYMENT_NEXT_STEP: Record<Order["payment"], string> = {
	transfer: "Coordinamos el pago: te pasamos los datos por email.",
	cash: "Coordinamos la entrega: pagás en efectivo cuando la recibís.",
};

const CLOSED_STATUS_NOTE: Record<
	Exclude<Order["status"], "nuevo" | "en preparación">,
	string
> = {
	enviado: "El pedido ya salió del local.",
	entregado: "El pedido ya está entregado.",
	cancelado: "El pedido está cancelado: no hay nada que coordinar.",
};

function headingOf(order: Order): string {
	if (order.status === "nuevo") {
		return "Listo: el pedido quedó confirmado";
	}

	if (order.status === CANCELLED_ORDER_STATUS) {
		return "Tu pedido está cancelado";
	}

	return "Tu pedido";
}

function leadOf(order: Order): string {
	if (order.status === "nuevo") {
		return "Guardá el número para encontrarlo después.";
	}

	if (order.status === CANCELLED_ORDER_STATUS) {
		return "No se cobró nada. Guardá el número por si necesitás consultarlo.";
	}

	return `Estado del pedido: ${order.status}. Guardá el número para encontrarlo después.`;
}

export function OrderReceipt({ order }: { order: Order }) {
	const closedNote =
		order.status === "nuevo" || order.status === "en preparación"
			? null
			: CLOSED_STATUS_NOTE[order.status];

	return (
		<div className={styles.page}>
			<CheckoutScreen
				aside={
					<aside aria-labelledby="que-sigue" className={styles.next}>
						<h2 className={styles.nextTitle} id="que-sigue">
							Qué sigue
						</h2>
						{closedNote === null ? (
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
						) : (
							<p className={styles.nextNote}>{closedNote}</p>
						)}
						<p className={styles.nextNote}>
							Pedido de demostración: no se cobró nada y no se envió ningún email.
						</p>
					</aside>
				}
				current="confirmacion"
			>
				<ReceiptHeading>{headingOf(order)}</ReceiptHeading>
				<p className={styles.lead}>{leadOf(order)}</p>

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
				<dl className={styles.paidRow}>
					<dt>Estado</dt>
					<dd>{order.status}</dd>
				</dl>

				<dl className={styles.buyer}>
					<div className={styles.buyerRow}>
						<dt>Recibe</dt>
						<dd>{order.buyer.name}</dd>
					</div>
					<div className={styles.buyerRow}>
						<dt>Entrega</dt>
						<dd>
							{order.buyer.address}, {order.buyer.city} ({order.buyer.postalCode})
						</dd>
					</div>
					<div className={styles.buyerRow}>
						<dt>Contacto</dt>
						<dd>
							{order.buyer.phone} · {order.buyer.email}
						</dd>
					</div>
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

export function OrderProofGate({
	codigo,
	attempted,
}: {
	codigo: string;
	attempted: boolean;
}) {
	return (
		<div className={styles.missing}>
			<h1 className={styles.missingTitle}>Buscá tu pedido</h1>
			<p className={styles.missingCopy}>
				Para ver el pedido «{codigo}» necesitamos el email con el que lo hiciste. El
				número solo no alcanza: el pedido es de quien lo compró.
			</p>

			<form className={styles.form} method="get">
				<label className={styles.label} htmlFor="email-del-pedido">
					Email del pedido
				</label>
				<input
					autoComplete="email"
					className={styles.input}
					id="email-del-pedido"
					name="email"
					required
					type="email"
				/>
				<button className={screenStyles.primary} type="submit">
					Ver el pedido
				</button>
			</form>

			{attempted ? (
				<p aria-live="polite" className={styles.missingCopy}>
					No pudimos mostrar el pedido «{codigo}» con esos datos. Revisá el email e intentá de nuevo.
				</p>
			) : null}

			<div className={screenStyles.actions}>
				<Link className={screenStyles.back} href="/catalogo">
					Ver el catálogo
					<ChevronRightIcon className={screenStyles.forwardIcon} />
				</Link>
				<Link className={screenStyles.back} href="/finalizar-compra">
					Empezar una compra
					<ChevronRightIcon className={screenStyles.forwardIcon} />
				</Link>
			</div>
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
