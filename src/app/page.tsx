import { connection } from "next/server";
import type { CSSProperties } from "react";
import Link from "next/link";

import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
import {
	FAMILY_ORDER,
	type CatalogCard,
} from "@/features/catalog/catalog";
import { FamilyList } from "@/features/catalog/family-list";
import { ChevronRightIcon } from "@/features/catalog/icons";
import { ProductCard } from "@/features/catalog/product-card";
import { prisma } from "@/lib/prisma";

import styles from "./page.module.css";

/*
 * The landing reads the database on every request.
 *
 * This route is deliberately request-time, not prerendered: `cacheComponents` is
 * enabled and the cloud database is intermittently unreachable, so a data
 * dependency at build time would make `pnpm build` fail for reasons unrelated to
 * this code. Route segment config (`export const dynamic`) is removed under
 * `cacheComponents`, so `connection()` is the documented way to say it: nothing
 * below it runs during the build. ISR is the later improvement — cache this route
 * once the data layer is stable.
 */
export const instant = false;

/**
 * The featured products, one per family, selected in the explicit family order
 * rather than in database order.
 */
async function getFeaturedProducts(): Promise<CatalogCard[]> {
	const rows = await prisma.product.findMany({
		where: { featured: true },
		select: {
			slug: true,
			name: true,
			category: true,
			images: true,
			variants: { select: { price: true } },
		},
		orderBy: { slug: "asc" },
	});

	return rows
		.map((row) => ({
			slug: row.slug,
			name: row.name,
			category: row.category,
			image: row.images[0] ?? null,
			priceFrom:
				row.variants.length === 0
					? null
					: Math.min(...row.variants.map((variant) => variant.price)),
		}))
		.sort(
			(first, second) =>
				FAMILY_ORDER.indexOf(first.category) -
				FAMILY_ORDER.indexOf(second.category),
		);
}

/** Products per family, so the family entry can state real counts. */
async function getFamilyCounts() {
	const rows = await prisma.product.groupBy({
		by: ["category"],
		_count: { _all: true },
	});

	const counts = Object.fromEntries(
		FAMILY_ORDER.map((category) => [category, 0]),
	) as Record<(typeof FAMILY_ORDER)[number], number>;

	for (const row of rows) {
		counts[row.category] = row._count._all;
	}

	return counts;
}

export default async function Home() {
	// Prerendering stops here: the queries below only ever run for a real request.
	await connection();

	const [featured, counts] = await Promise.all([
		getFeaturedProducts(),
		getFamilyCounts(),
	]);

	const families = FAMILY_ORDER.map((category) => ({
		category,
		count: counts[category],
	}));
	const total = families.reduce((sum, family) => sum + family.count, 0);
	const filledFamilies = families.filter((family) => family.count > 0).length;
	const emptyFamilies = families.length - filledFamilies;

	// The first featured work in family order is the monument; the rest hang below.
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
