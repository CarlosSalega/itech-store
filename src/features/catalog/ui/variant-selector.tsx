"use client";

import { useState } from "react";

import { useCart } from "@/features/cart/ui/provider";

import { formatArsPrice } from "../domain/format-price";
import { resolveVariant, splitPrice, type VariantOption } from "../domain/variant-selection";

import styles from "./variant-selector.module.css";

export type SelectorProduct = {
	slug: string;
	name: string;
	familyLabel: string;
	imageUrl: string | null;
};

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
