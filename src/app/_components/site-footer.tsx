import Link from "next/link";

import {
	FAMILY_LABEL,
	NAV_FAMILIES,
	catalogHref,
	type CatalogCard,
} from "@/features/catalog/catalog";

import styles from "./site-footer.module.css";

type SiteFooterProps = {
	/** The editorial picks, shown only on the landing. */
	products?: readonly CatalogCard[];
};

/**
 * Footer. It carries the sample-data notice exactly once per page: the seeded
 * prices are examples, and saying so here is the only place they are marked.
 *
 * The family entries link into the catalog with the filter applied. The products
 * column is the landing's editorial pick, so it is omitted on the catalog and
 * contact pages instead of repeating the featured names everywhere.
 */
export function SiteFooter({ products = [] }: SiteFooterProps) {
	return (
		<footer className={styles.footer}>
			<div className="wrap">
				<div className={styles.grid}>
					<div className={styles.col}>
						<h2 className={styles.heading}>Catálogo</h2>
						<ul>
							{NAV_FAMILIES.map((category) => (
								<li key={category}>
									<Link
										className={styles.link}
										href={catalogHref({ family: category })}
									>
										{FAMILY_LABEL[category]}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{products.length > 0 ? (
						<div className={styles.col}>
							<h2 className={styles.heading}>Destacados</h2>
							<ul>
								{products.map((product) => (
									<li key={product.slug}>
										<Link
											className={styles.link}
											href={`/catalogo/${product.slug}`}
										>
											{product.name}
										</Link>
									</li>
								))}
							</ul>
						</div>
					) : null}

					<div className={styles.col}>
						<h2 className={styles.heading}>Contacto</h2>
						<ul>
							<li>
								<Link className={styles.link} href="/catalogo">
									Ver el catálogo
								</Link>
							</li>
							<li>
								<Link className={styles.link} href="/contacto">
									Escribinos
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<p className={styles.notice}>
					Los precios de este catálogo son de ejemplo y no son precios de venta.
				</p>

				<div className={styles.base}>
					<span>iTech Store · Catálogo Apple</span>
					<span>Precios en pesos argentinos (ARS).</span>
				</div>
			</div>
		</footer>
	);
}
