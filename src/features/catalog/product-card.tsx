import Link from "next/link";

import {
	FAMILY_LABEL,
	PLACEHOLDER_IMAGE,
	type CatalogCard as CatalogCardModel,
} from "./catalog";
import { formatArsPrice } from "./format-price";
import styles from "./product-card.module.css";

type ProductCardProps = {
	product: CatalogCardModel;
	/** The monumental work of the page: the label steps up to title and numeral scale. */
	monument?: boolean;
};

/**
 * A work on the Galería wall: the photograph with no tile under it, then a wall
 * label whose hairline tick draws out on hover. The card is not a link; the
 * photograph and the name are.
 */
export function ProductCard({ product, monument = false }: ProductCardProps) {
	const href = `/catalogo/${product.slug}`;
	const image = product.image;
	const hasImage = image !== null;
	// The formatter owns the whole string ("$ 900.000"); splitting it here is the
	// only way to give the currency sign its own muted treatment.
	const price =
		product.priceFrom === null
			? null
			: formatArsPrice(product.priceFrom).split(" ");

	return (
		<article className={monument ? `${styles.work} ${styles.monument}` : styles.work}>
			<Link
				className={hasImage ? styles.media : `${styles.media} ${styles.empty}`}
				href={href}
			>
				{hasImage ? (
					// A plain <img> on purpose: `public/products` is gitignored and absent on a
					// fresh clone, so the build must never depend on those files existing.
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
								<span className={styles.currency}>$</span>
								{price.slice(1).join(" ")}
							</span>
						</>
					)}
				</span>
			</div>
		</article>
	);
}
