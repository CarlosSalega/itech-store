import { connection } from "next/server";
import type { CSSProperties } from "react";
import Link from "next/link";

import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
import { FAMILY_ORDER } from "@/features/catalog/domain/catalog";
import { FamilyList } from "@/features/catalog/ui/family-list";
import { ChevronRightIcon } from "@/components/icons";
import { ProductCard } from "@/features/catalog/ui/product-card";
import {
	countByFamily,
	listFeaturedProducts,
} from "@/features/catalog/server/catalog-queries";

import styles from "./page.module.css";

export const instant = false;

export default async function Home() {
	await connection();

	const [featuredRows, counts] = await Promise.all([
		listFeaturedProducts(),
		countByFamily(),
	]);

	const featured = [...featuredRows].sort(
		(first, second) =>
			FAMILY_ORDER.indexOf(first.category) -
			FAMILY_ORDER.indexOf(second.category),
	);

	const families = FAMILY_ORDER.map((category) => ({
		category,
		count: counts[category],
	}));
	const total = families.reduce((sum, family) => sum + family.count, 0);
	const filledFamilies = families.filter((family) => family.count > 0).length;
	const emptyFamilies = families.length - filledFamilies;

	const [monument, ...wall] = featured;

	return (
		<>
			<a className="skip" href="#main">
				Saltar al contenido
			</a>

			<SiteHeader />

			<main id="main">
				<section className={styles.hero} aria-labelledby="hero-title">
					<div className="wrap">
						<h1
							className={`${styles.heroTitle} ${styles.enter}`}
							id="hero-title"
							style={{ "--i": 0 } as CSSProperties}
						>
							<span className={styles.line}>Todo Apple,</span>
							<span className={styles.line}>con el precio</span>
							<span className={styles.line}>en pesos.</span>
						</h1>

						<p
							className={`${styles.deck} ${styles.enter}`}
							style={{ "--i": 1 } as CSSProperties}
						>
							iPad, Mac, Watch, AirPods y accesorios. Elegí el modelo y la
							capacidad, y el precio de esa variante aparece en el lugar.
						</p>

						<div
							className={`${styles.actions} ${styles.enter}`}
							style={{ "--i": 2 } as CSSProperties}
						>
							<Link className={styles.primary} href="/catalogo">
								Ver el catálogo
							</Link>
							<a className={styles.secondary} href="#familias">
								Recorrer por familia
								<ChevronRightIcon className={styles.secondaryIcon} />
							</a>
						</div>
					</div>

					{monument ? (
						<div
							className={`${styles.monument} ${styles.enter}`}
							style={{ "--i": 3 } as CSSProperties}
						>
							<ProductCard monument product={monument} />
						</div>
					) : null}
				</section>

				<div className="rule" role="presentation" />

				<section
					aria-labelledby="fam-title"
					className={styles.section}
					id="familias"
				>
					<div className="wrap">
						<div className={styles.sectionHead}>
							<h2 className={styles.sectionTitle} id="fam-title">
								{filledFamilies} familias colgadas.
								{emptyFamilies === 1
									? " Una todavía vacía."
									: emptyFamilies > 1
										? ` ${emptyFamilies} todavía vacías.`
										: ""}
							</h2>
							<p>Elegí por dónde entrar al catálogo completo.</p>
						</div>

						<FamilyList families={families} />

						{emptyFamilies > 0 ? (
							<p className={styles.familyNote}>
								Las familias sin productos quedan marcadas, sin góndola vacía.
								Si buscás algo que todavía no está,{" "}
								<Link href="/contacto">escribinos</Link>.
							</p>
						) : null}
					</div>
				</section>

				<section
					aria-labelledby="cat-title"
					className={styles.section}
					id="catalogo"
				>
					<div className="wrap">
						<div className={styles.sectionHead}>
							<h2 className={styles.sectionTitle} id="cat-title">
								{featured.length} de los {total}, colgados a distinta altura.
							</h2>
							<p>
								Un producto por familia, con el precio de la capacidad más
								chica, en pesos argentinos.
							</p>
						</div>

						<div className={styles.wall}>
							{wall.map((product) => (
								<ProductCard key={product.slug} product={product} />
							))}

							<div className={styles.cellText}>
								<p>
									Los otros {total - featured.length} productos están en el
									catálogo completo, cada uno con su etiqueta.
								</p>
								<Link className={styles.secondary} href="/catalogo">
									Ver todo el catálogo
									<ChevronRightIcon className={styles.secondaryIcon} />
								</Link>
							</div>
						</div>
					</div>
				</section>
			</main>

			<SiteFooter products={featured} />
		</>
	);
}
