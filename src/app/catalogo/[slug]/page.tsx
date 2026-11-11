import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";
import {
	FAMILY_LABEL,
	PLACEHOLDER_IMAGE,
	catalogHref,
	formatStorage,
	variantLabel,
} from "@/features/catalog/catalog";
import {
	findProductBySlug,
	listRelatedProducts,
} from "@/features/catalog/catalog-queries";
import { formatArsPrice } from "@/features/catalog/format-price";
import { ChevronRightIcon } from "@/features/catalog/icons";
import { ProductCard } from "@/features/catalog/product-card";
import { VariantSelector } from "@/features/catalog/variant-selector";

import styles from "./producto.module.css";

/*
 * Request-time, like the rest of the catalog: the cloud database must not be a
 * build dependency, and the price of a variant is read from it on every request.
 */
export const instant = false;

type ProductPageProps = {
	params: Promise<{ slug: string }>;
};

export async function generateMetadata({
	params,
}: ProductPageProps): Promise<Metadata> {
	const { slug } = await params;
	const product = await findProductBySlug(slug);

	if (product === null) {
		return { title: "Producto no encontrado — iTech Store" };
	}

	return {
		title: `${product.name} — iTech Store`,
		description: product.description,
	};
}

export default async function ProductoPage({ params }: ProductPageProps) {
	// Prerendering stops here: the queries below only run for a real request.
	await connection();

	const { slug } = await params;
	const product = await findProductBySlug(slug);

	// An unknown slug is a real 404: nothing in the catalog can name a product
	// that is not in the database.
	if (product === null) notFound();

	const related = await listRelatedProducts(product.category, product.slug, 4);

	const familySlug = catalogHref({ family: product.category });
	const imageCount = product.images.length;
	const hasImages = imageCount > 0;
	const photoCount = hasImages ? imageCount : 0;
	const capacities = product.variants
		.map((variant) => formatStorage(variant.storage))
		.filter((label): label is string => label !== null);
	const uniqueCapacities = [...new Set(capacities)];
	const priceFrom =
		product.variants.length === 0
			? null
			: Math.min(...product.variants.map((variant) => variant.price));
	const variantMeta = [
		`${photoCount} ${photoCount === 1 ? "foto" : "fotos"}`,
		product.variants.length === 1
			? "1 presentación"
			: `${product.variants.length} presentaciones`,
	]
		.filter(Boolean)
		.join(" · ");

	const selectorVariants = product.variants.map((variant) => ({
		id: variant.id,
		sku: variant.sku,
		label: variantLabel(variant.storage, variant.color),
		price: variant.price,
		stock: variant.stock,
	}));

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
								<Link href={catalogHref({})}>Catálogo</Link>
							</li>
							<li aria-hidden="true" className={styles.sep}>
								/
							</li>
							<li>
								<Link href={familySlug}>{FAMILY_LABEL[product.category]}</Link>
							</li>
							<li aria-hidden="true" className={styles.sep}>
								/
							</li>
							<li aria-current="page">{product.name}</li>
						</ol>
					</nav>
				</div>

				<section aria-labelledby="product-title" className={styles.product}>
					<div className="wrap">
						<div className={styles.grid}>
							<div>
								{/* The main photograph hangs with no tile under it and dissolves
								    into the page; the wall label under it is the page's h1. */}
								<figure className={styles.media}>
									{hasImages ? (
										// A plain <img> on purpose: `public/products` is gitignored and
										// absent on a fresh clone, so the app must never let the build
										// or the renderer depend on those files.
										// eslint-disable-next-line @next/next/no-img-element
										<img
											alt={product.name}
											decoding="async"
											height={640}
											loading="lazy"
											src={product.images[0]}
											width={640}
										/>
									) : (
										<div className={styles.empty}>
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img
												alt=""
												decoding="async"
												height={64}
												loading="lazy"
												src={PLACEHOLDER_IMAGE}
												width={64}
											/>
											<span className={styles.emptyState}>
												Imagen no disponible
											</span>
										</div>
									)}

									<figcaption className={styles.label}>
										<h1 className={styles.name} id="product-title">
											{product.name}
										</h1>
										<span className={styles.meta}>
											{FAMILY_LABEL[product.category]} · {variantMeta}
										</span>
									</figcaption>
								</figure>

								{imageCount > 1 ? (
									// Every photo of the product is rendered: a numbered strip of small
									// works, the way the artboard hangs them.
									<ul className={styles.thumbs}>
										{product.images.map((image, index) => (
											<li className={styles.thumb} key={image}>
												{/* eslint-disable-next-line @next/next/no-img-element */}
												<img
													alt={`Foto ${index + 1} de ${imageCount}: ${product.name}`}
													decoding="async"
													height={640}
													loading="lazy"
													src={image}
													width={640}
												/>
												<span className={styles.thumbNumber}>
													{String(index + 1).padStart(2, "0")}
												</span>
											</li>
										))}
									</ul>
								) : null}
							</div>

							<div className={styles.body}>
								<p className={styles.lead}>{product.description}</p>

								<VariantSelector variants={selectorVariants} />
							</div>
						</div>
					</div>
				</section>

				<div className="rule" role="presentation" />

				<section aria-labelledby="ficha-title" className={styles.sheetSection}>
					<div className="wrap">
						<div className={styles.sheetHead}>
							<h2 className={styles.sheetTitle} id="ficha-title">
								La ficha, línea por línea.
							</h2>
							<p>
								Lo que el catálogo sabe de este producto. El precio y el stock de
								la variante elegida están arriba, junto al selector.
							</p>
						</div>

						<dl className={styles.sheet}>
							<div className={styles.row}>
								<dt>Modelo</dt>
								<dd>{product.name}</dd>
							</div>
							<div className={styles.row}>
								<dt>Familia</dt>
								<dd>{FAMILY_LABEL[product.category]}</dd>
							</div>
							<div className={styles.row}>
								<dt>Capacidades</dt>
								<dd>
									{uniqueCapacities.length === 0
										? "No se vende por capacidad"
										: uniqueCapacities.join(" · ")}
								</dd>
							</div>
							<div className={styles.row}>
								<dt>Presentaciones</dt>
								<dd>{product.variants.length}</dd>
							</div>
							<div className={styles.row}>
								<dt>Fotos del producto</dt>
								<dd>{photoCount}</dd>
							</div>
							<div className={styles.row}>
								<dt>Precio más bajo</dt>
								<dd>
									{priceFrom === null
										? "A confirmar"
										: `Desde ${formatArsPrice(priceFrom)}`}
								</dd>
							</div>
						</dl>
					</div>
				</section>

				{related.length > 0 ? (
					<>
						<div className="rule" role="presentation" />

						<section aria-labelledby="rel-title" className={styles.related}>
							<div className="wrap">
								<div className={styles.sheetHead}>
									<h2 className={styles.sheetTitle} id="rel-title">
										Más de {FAMILY_LABEL[product.category]}.
									</h2>
									<p>
										Del mismo catálogo, con el precio de la capacidad más chica de
										cada uno.
									</p>
								</div>

								<div className={styles.wall}>
									{related.map((item) => (
										<ProductCard key={item.slug} product={item} />
									))}
								</div>

								<div className={styles.relatedAction}>
									<Link className={styles.secondary} href={familySlug}>
										Ver toda la familia
										<ChevronRightIcon className={styles.secondaryIcon} />
									</Link>
								</div>
							</div>
						</section>
					</>
				) : null}
			</main>

			<SiteFooter />
		</>
	);
}
