"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { PLACEHOLDER_IMAGE } from "@/features/catalog/domain/catalog";
import { formatArsPrice } from "@/features/catalog/domain/format-price";
import {
	BagIcon,
	CheckIcon,
	ChevronLeftIcon,
	CloseIcon,
	MinusIcon,
	PlusIcon,
	TrashIcon,
} from "@/components/icons";

import {
	MAX_LINE_QUANTITY,
	cartCountLabel,
	cartLineTotal,
	lineContextLabel,
	variantLabelOf,
	type CartLine,
} from "../domain/cart";
import { useCart } from "./provider";

import styles from "./drawer.module.css";

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartDrawer() {
	const { cart, totals, lastAdded, isOpen, verification, closeCart } = useCart();
	const panelRef = useRef<HTMLElement | null>(null);
	const openerRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		openerRef.current =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;

		const root = document.documentElement;
		const scrollbarGutter = window.innerWidth - root.clientWidth;
		const previousOverflowY = root.style.overflowY;
		const previousPaddingRight = root.style.paddingRight;

		root.style.overflowY = "hidden";

		if (scrollbarGutter > 0) {
			root.style.paddingRight = `${scrollbarGutter}px`;
		}

		panelRef.current?.focus({ preventScroll: true });

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				event.preventDefault();
				closeCart();
				return;
			}

			if (event.key !== "Tab") {
				return;
			}

			const panel = panelRef.current;

			if (panel === null) {
				return;
			}

			const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
				(element) => element.offsetParent !== null,
			);
			const first = focusable[0];
			const last = focusable.at(-1);

			if (first === undefined || last === undefined) {
				event.preventDefault();
				panel.focus();
				return;
			}

			if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
				event.preventDefault();
				last.focus();
				return;
			}

			if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}

		document.addEventListener("keydown", onKeyDown);

		return () => {
			document.removeEventListener("keydown", onKeyDown);
			root.style.overflowY = previousOverflowY;
			root.style.paddingRight = previousPaddingRight;
			openerRef.current?.focus({ preventScroll: true });
		};
	}, [isOpen, closeCart]);

	if (!isOpen) {
		return null;
	}

	const hasLines = cart.lines.length > 0;
	const listLines = lastAdded
		? cart.lines.filter((line) => line.variantId !== lastAdded.variantId)
		: cart.lines;

	return (
		<div className={styles.root}>
			<div aria-hidden="true" className={styles.scrim} onClick={closeCart} />

			<section
				aria-labelledby="cart-panel-title"
				aria-modal="true"
				className={styles.panel}
				ref={panelRef}
				role="dialog"
				tabIndex={-1}
			>
				<header className={styles.head}>
					<div>
						<div className={styles.titleRow}>
							<BagIcon className={styles.titleIcon} />
							<h2 className={styles.title} id="cart-panel-title">
								Tu carrito
							</h2>
						</div>
						{hasLines ? (
							<span className={styles.count}>{cartCountLabel(totals)}</span>
						) : null}
					</div>
					<button
						aria-label="Cerrar el carrito"
						className={styles.iconButton}
						onClick={closeCart}
						type="button"
					>
						<CloseIcon className={styles.icon} />
					</button>
				</header>

				{hasLines ? (
					<div className={styles.scroll}>
						{lastAdded === undefined ? null : (
							<div className={styles.recent}>
								<p className={styles.recentLabel}>
									<CheckIcon className={styles.recentIcon} />
									Recién agregado
								</p>
								<div className={styles.recentItem}>
									<LineImage line={lastAdded} size="recent" />
									<div>
										<p className={styles.recentName}>{lastAdded.productName}</p>
										<span className={styles.recentContext}>
											{lineContextLabel(lastAdded)}
										</span>
										<LineControls line={lastAdded} />
									</div>
								</div>
							</div>
						)}

						<h3 className="sr-only">Productos en el carrito</h3>

						<ol className={styles.lines}>
							{listLines.map((line) => (
								<li className={styles.line} key={line.variantId}>
									<LineImage line={line} size="line" />
									<div>
										<Link
											className={styles.lineName}
											href={`/catalogo/${line.productSlug}`}
											onClick={closeCart}
										>
											{line.productName}
										</Link>
										<p className={styles.lineVariant}>{variantLabelOf(line)}</p>
										{line.available ? null : (
											<p className={styles.unavailable}>
												Ya no está disponible. Quitalo para seguir con la compra.
											</p>
										)}
										<LineControls line={line} />
									</div>
								</li>
							))}
						</ol>
					</div>
				) : (
					<div className={styles.empty}>
						<div aria-hidden="true" className={styles.mark}>
							<BagIcon className={styles.markIcon} />
						</div>
						<h3 className={styles.emptyTitle}>Tu carrito está vacío</h3>
						<p className={styles.emptyCopy}>
							Agregá un producto y va a aparecer acá con su capacidad, la cantidad
							y el total.
						</p>
						<Link className={styles.emptyLink} href="/catalogo" onClick={closeCart}>
							Ver el catálogo
						</Link>
					</div>
				)}

				<footer className={styles.foot}>
					{verification === "checking" ? (
						<p aria-live="polite" className={styles.notice}>
							Verificando los precios contra el catálogo…
						</p>
					) : null}
					{verification === "failed" ? (
						<p aria-live="polite" className={styles.notice}>
							No pudimos verificar los precios. Mostramos los últimos que vimos.
						</p>
					) : null}
					{hasLines ? (
						<>
							<dl className={styles.totals}>
								<dt>Total</dt>
								<dd>{formatArsPrice(totals.totalCents)}</dd>
							</dl>
							<Link
								className={styles.checkout}
								href="/finalizar-compra"
								onClick={closeCart}
							>
								Finalizar compra
							</Link>
						</>
					) : null}
					<button className={styles.keepBrowsing} onClick={closeCart} type="button">
						<ChevronLeftIcon className={styles.keepIcon} />
						Seguir comprando
					</button>
					<p className={styles.caption}>
						El envío se coordina al finalizar. Los precios son de ejemplo y no son
						precios de venta.
					</p>
				</footer>
			</section>
		</div>
	);
}

function LineControls({ line }: { line: CartLine }) {
	const { setQuantity, removeLine } = useCart();

	return (
		<div className={styles.lineBottom}>
			<div
				aria-label={`Cantidad de ${line.productName}`}
				className={styles.qty}
				role="group"
			>
				<button
					aria-label={`Quitar una unidad de ${line.productName}`}
					disabled={!line.available || line.quantity <= 1}
					onClick={() => setQuantity(line.variantId, line.quantity - 1)}
					type="button"
				>
					<MinusIcon className={styles.qtyIcon} />
				</button>
				<output aria-live="polite">{line.quantity}</output>
				<button
					aria-label={`Agregar una unidad de ${line.productName}`}
					disabled={!line.available || line.quantity >= MAX_LINE_QUANTITY}
					onClick={() => setQuantity(line.variantId, line.quantity + 1)}
					type="button"
				>
					<PlusIcon className={styles.qtyIcon} />
				</button>
			</div>
			<button
				aria-label={`Quitar ${line.productName} del carrito`}
				className={styles.remove}
				onClick={() => removeLine(line.variantId)}
				type="button"
			>
				<TrashIcon className={styles.removeIcon} />
			</button>
			<span className={styles.lineTotal}>{formatArsPrice(cartLineTotal(line))}</span>
		</div>
	);
}

function LineImage({ line, size }: { line: CartLine; size: "line" | "recent" }) {
	const className = size === "recent" ? styles.recentMedia : styles.lineMedia;

	return (
		<figure className={className}>
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
