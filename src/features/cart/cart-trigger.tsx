"use client";

import { BagIcon } from "@/features/catalog/icons";

import { useCart } from "./cart-provider";

import styles from "./cart-trigger.module.css";

/**
 * The header's bag, now that there is a cart behind it. It is a client component
 * only because of the count and the panel: during hydration React renders the
 * server snapshot (an empty cart, no badge) and immediately re-reads the stored
 * one, so no markup ever disagrees.
 */
export function CartTrigger({
	className,
	iconClassName,
}: {
	className?: string;
	iconClassName?: string;
}) {
	const { totals, isOpen, openCart } = useCart();
	const units = totals.unitCount;
	const countLabel =
		units === 0
			? "Carrito, vacío"
			: `Carrito, ${units} ${units === 1 ? "unidad" : "unidades"}`;

	return (
		<button
			aria-expanded={isOpen}
			aria-haspopup="dialog"
			className={className === undefined ? styles.trigger : `${className} ${styles.trigger}`}
			onClick={openCart}
			type="button"
		>
			<BagIcon className={iconClassName} />
			<span aria-live="polite" className="sr-only">
				{countLabel}
			</span>
			{units > 0 ? (
				<span aria-hidden="true" className={styles.badge}>
					{units > 9 ? "9+" : units}
				</span>
			) : null}
		</button>
	);
}
