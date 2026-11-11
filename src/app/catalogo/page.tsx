import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
import {
	FAMILY_LABEL,
	FAMILY_ORDER,
	catalogHref,
	familyFromSlug,
} from "@/features/catalog/catalog";
import { CatalogPagination } from "@/features/catalog/catalog-pagination";
import {
	countByFamily,
	countProducts,
	listProducts,
} from "@/features/catalog/catalog-queries";
import { ChevronRightIcon } from "@/features/catalog/icons";
import { CATALOG_PAGE_SIZE, paginatePage } from "@/features/catalog/pagination";
import { ProductCard } from "@/features/catalog/product-card";

import styles from "./catalogo.module.css";

/*
 * The listing is request-time for the same reason as the landing: the cloud
 * database is not reachable during `pnpm build`, so the queries must never run
 * as part of the static shell. `instant = false` allows the navigation to wait
 * for them instead of demanding an instant UI from an uncached read.
 */
export const instant = false;

type CatalogSearchParams = {
	familia?: string | string[];
	page?: string | string[];
};

function requestedPage(params: CatalogSearchParams): number {
	const raw = Array.isArray(params.page) ? params.page[0] : params.page;
	return raw === undefined ? 1 : Number(raw);
}

export async function generateMetadata({
	searchParams,
}: {
	searchParams: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
	const family = familyFromSlug((await searchParams).familia);
	const label = family === null ? "El catálogo completo" : FAMILY_LABEL[family];

	return {
		title: `${label} — iTech Store`,
		description:
			family === null
				? "Todos los productos del catálogo Apple, con el precio de cada capacidad en pesos argentinos."
				: `${FAMILY_LABEL[family]} en el catálogo de iTech Store, con el precio de cada capacidad en pesos argentinos.`,
	};
}

export default async function CatalogoPage({
	searchParams,
}: {
	searchParams: Promise<CatalogSearchParams>;
}) {
	// Prerendering stops here: the queries below only run for a real request.
	await connection();

	const params = await searchParams;
	const family = familyFromSlug(params.familia);

	const [total, counts] = await Promise.all([
		countProducts(family),
		countByFamily(),
	]);

	// An unknown `?familia=` value leaves `family` null, so it renders the whole
	// catalog instead of a 404. An out-of-range `?page=` clamps to the last page
	// inside `paginatePage`; the URL keeps the number the visitor asked for.
	const { page, pageCount, skip, take } = paginatePage(
		requestedPage(params),
		total,
		CATALOG_PAGE_SIZE,
	);

	const products = await listProducts(family, skip, take);

	const grandTotal = FAMILY_ORDER.reduce(
		(sum, category) => sum + counts[category],
		0,
	);
	const filledFamilies = FAMILY_ORDER.filter(
		(category) => counts[category] > 0,
	).length;
	const emptyFamilies = FAMILY_ORDER.length - filledFamilies;

	const wallTitle =
		family === null
			? pageCount === 1
				? `Los ${total}, en una sola página.`
				: `Los ${total}, de a ${CATALOG_PAGE_SIZE}.`
			: `${FAMILY_LABEL[family]}: ${total === 1 ? "1 producto" : `${total} productos`}.`;

	const first = skip + 1;
	const last = skip + products.length;

	return (
		<>
			<a className="skip" href="#main">
				Saltar al contenido
			</a>

			<SiteHeader />

			<main id="main">
				<div className="wrap">
					<nav aria-label="Ruta de navegación" className={styles.crumbs}>
						<ol>
							<li>
								<Link href="/">Inicio</Link>
							</li>
							<li aria-hidden="true" className={styles.sep}>
								/
							</li>
							<li aria-current="page">Catálogo</li>
						</ol>
					</nav>

					<header className={styles.head}>
						<h1 className={styles.title}>El catálogo completo.</h1>
						<p className={styles.deck}>
							{grandTotal} productos Apple en {filledFamilies} familias. El precio
							de cada ficha es el de la capacidad elegida, en pesos argentinos.
						</p>
					</header>

					<nav aria-label="Filtrar por familia" className={styles.filters}>
						<div className={styles.filterRow}>
							<Link
								aria-current={family === null ? "page" : undefined}
								className={styles.filter}
								href={catalogHref({})}
							>
								Todo
								<span className={styles.count}>{grandTotal}</span>
							</Link>

							{FAMILY_ORDER.map((category) =>
								counts[category] === 0 ? (
									// A family with no products keeps its entry and states the
									// zero: it is never hidden and never faked with stock copy.
									<span
										className={`${styles.filter} ${styles.filterEmpty}`}
										key={category}
									>
										{FAMILY_LABEL[category]}
										<span className={styles.count}>0 productos</span>
									</span>
								) : (
									<Link
										aria-current={family === category ? "page" : undefined}
										className={styles.filter}
										href={catalogHref({ family: category })}
										key={category}
									>
										{FAMILY_LABEL[category]}
										<span className={styles.count}>{counts[category]}</span>
									</Link>
								),
							)}
						</div>

						{emptyFamilies > 0 ? (
							<p className={styles.filterNote}>
								Las familias en cero siguen a la vista sin góndola vacía. Si
								buscás algo que todavía no está,{" "}
								<Link href="/contacto">escribinos</Link>.
							</p>
						) : null}
					</nav>
				</div>

				<div className={`rule ${styles.separator}`} role="presentation" />

				<section aria-labelledby="wall-title" className={styles.wallSection}>
					<div className="wrap">
						<div className={styles.wallHead}>
							<h2 className={styles.wallTitle} id="wall-title">
								{wallTitle}
							</h2>
							{products.length > 0 ? (
								<p className={styles.wallCounter}>
									Mostrando {first}–{last} de {total} · Página {page} de{" "}
									{pageCount}
								</p>
							) : null}
						</div>

						{products.length > 0 ? (
							<>
								<div className={styles.wall}>
									{products.map((product) => (
										<ProductCard key={product.slug} product={product} />
									))}
								</div>

								{pageCount > 1 ? (
									<CatalogPagination
										family={family}
										page={page}
										pageCount={pageCount}
									/>
								) : (
									<p className={styles.singlePage}>
										Todo el catálogo entra en esta página.
									</p>
								)}
							</>
						) : (
							<div className={styles.empty}>
								<h3 className={styles.emptyTitle}>
									{family === null
										? "El catálogo está vacío."
										: `${FAMILY_LABEL[family]} todavía no tiene productos.`}
								</h3>
								<p className={styles.emptyCopy}>
									El catálogo tiene {grandTotal} productos en {filledFamilies}{" "}
									familias. Si buscás algo que no está, escribinos y lo
									buscamos.
								</p>
								<div className={styles.emptyActions}>
									<Link className={styles.primary} href="/catalogo">
										Ver todo el catálogo
									</Link>
									<Link className={styles.secondary} href="/contacto">
										Escribinos
										<ChevronRightIcon className={styles.secondaryIcon} />
									</Link>
								</div>
							</div>
						)}
					</div>
				</section>
			</main>

			<SiteFooter />
		</>
	);
}
