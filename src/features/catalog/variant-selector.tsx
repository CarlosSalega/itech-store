"use client";

import { useState } from "react";

import { formatArsPrice } from "./format-price";
import { resolveVariant, splitPrice } from "./variant-selection";

import styles from "./variant-selector.module.css";

/**
 * One variant of a product, reduced to what the selector renders. Everything
 * here is serialisable, because it crosses the server/client boundary.
 */
export type VariantOption = {
	id: string;
	sku: string;
	/** Capacity, colour, or a single-presentation label. */
	label: string;
	/** Integer ARS cents. */
	price: number;
	stock: number;
};

/**
 * The capacity selector. This is the only client component of the product page:
 * the price, the SKU and the stock are the ones of the chosen variant, and they
 * are already server-rendered for the first variant, so the page reads correctly
 * before hydration.
 *
 * The cart does not exist in this milestone, so the action is disabled and says
 * so in text. Nothing here fakes a flow or a success state.
 */
export function VariantSelector({ variants }: { variants: VariantOption[] }) {
	const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");
	const variant = resolveVariant(variants, selectedId);

	if (variant === undefined) {
		return (
			<p className={styles.noVariants}>
				Este producto todavía no tiene una presentación cargada, así que no hay
				precio que mostrar.
			</p>
		);
	}

	// The formatter owns the whole string ("$ 900.000"); splitting it lets the
	// currency sign take the smaller, muted treatment of the design system.
	const { currency, amount } = splitPrice(formatArsPrice(variant.price));

	return (
		<>
			<fieldset className={styles.fieldset}>
				<legend className={styles.legend}>Capacidad</legend>
				<div className={styles.caps}>
					{variants.map((option) => (
						<label className={styles.cap} key={option.id}>
							<input
								checked={option.id === variant.id}
								className={styles.input}
								name="capacidad"
								onChange={() => setSelectedId(option.id)}
								type="radio"
								value={option.sku}
							/>
							<span className={styles.capName}>{option.label}</span>
							<span className={styles.capPrice}>
								{formatArsPrice(option.price)}
							</span>
						</label>
					))}
				</div>
			</fieldset>

			<div aria-live="polite" className={styles.priceBlock}>
				<span className={styles.priceLead}>
					Precio de la variante · {variant.label}
				</span>
				<span className={styles.amount}>
					<span className={styles.currency}>{currency}</span>
					{amount}
				</span>
				<p className={styles.priceNote}>
					El precio es el de la capacidad elegida. No hay un precio general que
					después cambie en el carrito.
				</p>
				<p className={styles.sku}>
					SKU <span className={styles.skuValue}>{variant.sku}</span>
				</p>
			</div>

			<p className={styles.stock}>
				<span aria-hidden="true" className={styles.dot} />
				{variant.stock === 0 ? (
					<>
						Sin stock de muestra <span className={styles.sample}>· valor de ejemplo</span>
					</>
				) : (
					<>
						Stock de muestra: <b>{variant.stock}</b>{" "}
						{variant.stock === 1 ? "unidad" : "unidades"}{" "}
						<span className={styles.sample}>· valor de ejemplo</span>
					</>
				)}
			</p>

			<div className={styles.actions}>
				<button
					aria-describedby="cart-note"
					className={styles.buy}
					disabled
					type="button"
				>
					Agregar al carrito
				</button>
			</div>
			<p className={styles.soon} id="cart-note">
				Próximamente: el carrito todavía no existe en esta versión del catálogo,
				así que este botón está desactivado a propósito y no se envía nada.
			</p>
		</>
	);
}
