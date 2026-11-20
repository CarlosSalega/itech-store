"use client";

import { BagIcon } from "@/features/catalog/icons";

import { useCart } from "./provider";

import styles from "./trigger.module.css";

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
