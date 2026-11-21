"use client";

import { useState } from "react";

import { useCart } from "@/features/cart/ui/provider";

import { formatArsPrice } from "../domain/format-price";
import { resolveVariant, splitPrice, type VariantOption } from "../domain/variant-selection";

import styles from "./variant-selector.module.css";

/** What the cart needs to know about the product this variant belongs to. */
export type SelectorProduct = {
	slug: string;
	name: string;
	/** The family label, used by the cart when the variant has no capacity. */
	familyLabel: string;
	imageUrl: string | null;
};

/**
 * The capacity selector. This is the only client component of the product page:
 * the price, the SKU and the stock are the ones of the chosen variant, and they
 * are already server-rendered for the first variant, so the page reads correctly
 * before hydration.
 *
 * The cart does exist now: the action adds the chosen variant and opens the
 * drawer, and a variant with no stock keeps the action disabled and says so
 * instead of faking a flow.
 */
export function VariantSelector({
	variants,
	product,
}: {
	variants: VariantOption[];
	product: SelectorProduct;
}) {
	const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");
	const { addLine, openCart } = useCart();
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
					aria-describedby={variant.stock === 0 ? "cart-note" : undefined}
					className={styles.buy}
					disabled={variant.stock === 0}
					onClick={() => {
						addLine({
							variantId: variant.id,
							sku: variant.sku,
							productSlug: product.slug,
							productName: product.name,
							familyLabel: product.familyLabel,
							variantLabel: variant.variantLabel,
							imageUrl: product.imageUrl,
							imageAlt: `${product.name}, ${variant.label}`,
							unitPriceCents: variant.price,
							quantity: 1,
							// The snapshot claims nothing about the database: opening the cart
							// revalidates it against the catalogue.
							available: true,
						});
						openCart();
					}}
					type="button"
				>
					Agregar al carrito
				</button>
			</div>
			{variant.stock === 0 ? (
				<p className={styles.soon} id="cart-note">
					Esta presentación no tiene stock de muestra, así que no se puede
					agregar al carrito.
				</p>
			) : null}
		</>
	);
}
