import Link from "next/link";

import {
	FAMILY_LABEL,
	PLACEHOLDER_IMAGE,
	type CatalogCard as CatalogCardModel,
} from "../domain/catalog";
import { formatArsPrice } from "../domain/format-price";
import { splitPrice } from "../domain/variant-selection";
import styles from "./product-card.module.css";

type ProductCardProps = {
	product: CatalogCardModel;
	monument?: boolean;
};

export function ProductCard({ product, monument = false }: ProductCardProps) {
	const href = `/catalogo/${product.slug}`;
	const image = product.image;
	const hasImage = image !== null;
	const price =
		product.priceFrom === null
			? null
			: splitPrice(formatArsPrice(product.priceFrom));

	return (
		<article className={monument ? `${styles.work} ${styles.monument}` : styles.work}>
			<Link
				className={hasImage ? styles.media : `${styles.media} ${styles.empty}`}
				href={href}
			>
				{hasImage ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={image ?? PLACEHOLDER_IMAGE}
						alt={product.name}
						width={640}
						height={640}
						loading="lazy"
						decoding="async"
					/>
				) : (
					<>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={PLACEHOLDER_IMAGE}
							alt=""
							width={64}
							height={64}
							loading="lazy"
							decoding="async"
						/>
						<span className={styles.emptyState}>Imagen no disponible</span>
					</>
				)}
			</Link>

			<div className={styles.label}>
				<span className={styles.name}>
					<Link href={href}>{product.name}</Link>
				</span>
				<span className={styles.meta}>
					{FAMILY_LABEL[product.category]}
					{price === null ? (
						<span className={styles.from}>Precio a confirmar</span>
					) : (
						<>
							<span className={styles.from}>Desde</span>
							<span className={styles.price}>
								<span className={styles.currency}>{price.currency}</span>
								{price.amount}
							</span>
						</>
					)}
				</span>
			</div>
		</article>
	);
}
