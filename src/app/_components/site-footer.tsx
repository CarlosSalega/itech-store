import Link from "next/link";

import {
	FAMILY_LABEL,
	NAV_FAMILIES,
	type CatalogCard,
} from "@/features/catalog/catalog";

import styles from "./site-footer.module.css";

type SiteFooterProps = {
	products: readonly CatalogCard[];
};

/**
 * Footer. It carries the sample-data notice exactly once per page: the seeded
 * prices are examples, and saying so here is the only place they are marked.
 *
 * The family entries are in-page anchors today, as in the header.
 */
export function SiteFooter({ products }: SiteFooterProps) {
	return (
		<footer className={styles.footer}>
			<div className="wrap">
				<div className={styles.grid}>
					<div className={styles.col}>
						<h2 className={styles.heading}>Catálogo</h2>
						<ul>
							{NAV_FAMILIES.map((category) => (
								<li key={category}>
									<a className={styles.link} href="#familias">
										{FAMILY_LABEL[category]}
									</a>
								</li>
							))}
						</ul>
					</div>

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
