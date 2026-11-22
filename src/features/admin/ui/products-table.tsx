import Link from "next/link";

import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import {
	FAMILY_LABEL,
	PLACEHOLDER_IMAGE,
} from "@/features/catalog/domain/catalog";

import {
	isLowOnStock,
	productPriceFrom,
	productStockTotal,
	type AdminProduct,
} from "../domain/product";
import { StarIcon } from "./icons";
import { Money } from "./money";

import styles from "./products.module.css";

function variantCount(count: number): string {
	return count === 1 ? "1 variante" : `${count} variantes`;
}

function featuredLegend(featured: number): string {
	if (featured === 0) {
		return "La estrella marca los productos destacados en la tienda.";
	}

	if (featured === 1) {
		return "La estrella marca el producto destacado en la tienda.";
	}

	if (featured === 2) {
		return "La estrella marca los dos productos destacados en la tienda.";
	}

	return `La estrella marca los ${featured} productos destacados en la tienda.`;
}

export function ProductsTable({
	products,
	totalCount,
}: {
	products: readonly AdminProduct[];
	totalCount: number;
}) {
	const variants = products.reduce((sum, product) => sum + product.variants.length, 0);
	const published = products.filter((product) => product.published).length;
	const low = products.filter((product) => isLowOnStock(product)).length;
	const featured = products.filter((product) => product.destacado).length;
	const summary =
		products.length === totalCount
			? `Mostrando los ${totalCount} productos del catálogo`
			: `Mostrando ${products.length} de los ${totalCount} productos`;

	return (
		<>
			<table className={styles.products} role="table">
				<caption className="sr-only">
					{`Los ${totalCount} productos del catálogo, con su familia, cantidad de
					variantes, precio más bajo, stock total, estado de publicación y acciones.`}
				</caption>
				<thead role="rowgroup">
					<tr role="row">
						<th role="columnheader" scope="col">
							Producto
						</th>
						<th role="columnheader" scope="col">
							Variantes
						</th>
						<th className={styles.num} role="columnheader" scope="col">
							Precio desde
						</th>
						<th className={styles.num} role="columnheader" scope="col">
							Stock
						</th>
						<th role="columnheader" scope="col">
							Estado
						</th>
						<th role="columnheader" scope="col">
							<span className="sr-only">Acciones</span>
						</th>
					</tr>
				</thead>
				<tbody role="rowgroup">
					{products.map((product) => {
						const lowStock = isLowOnStock(product);
						const price = productPriceFrom(product);

						return (
							<tr key={product.slug} role="row">
								<td className={styles.cellPad} role="cell">
									<span className={styles.productCell}>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											alt=""
											className={styles.thumb}
											height={36}
											src={product.image ?? PLACEHOLDER_IMAGE}
											width={36}
										/>
										<span className={styles.productText}>
											<Link
												className={styles.productName}
												href={`/admin/productos/${product.slug}`}
											>
												{product.destacado ? (
													<>
														<StarIcon className={styles.star} />
														<span className="sr-only">, destacado</span>
													</>
												) : null}
												{product.name}
											</Link>
											<span className={styles.productMeta}>
												{FAMILY_LABEL[product.category]}
											</span>
										</span>
									</span>
								</td>
								<td role="cell">
									<span className={styles.cellLabel} aria-hidden="true">
										Variantes
									</span>
									<span className={styles.variants}>
										{variantCount(product.variants.length)}
									</span>
								</td>
								<td className={styles.num} role="cell">
									<span className={styles.cellLabel} aria-hidden="true">
										Precio desde
									</span>
									{price === null ? (
										<span className={styles.noPrice}>Sin precio</span>
									) : (
										<Money cents={price} className={styles.price} />
									)}
								</td>
								<td className={styles.num} role="cell">
									<span className={styles.cellLabel} aria-hidden="true">
										Stock
									</span>
									<span className={lowStock ? styles.stockLow : styles.stock}>
										{productStockTotal(product)} u.
										{lowStock ? (
											<span className={styles.stockNote}>stock bajo</span>
										) : null}
									</span>
								</td>
								<td role="cell">
									<span className={styles.cellLabel} aria-hidden="true">
										Estado
									</span>
									{product.published ? (
										<span className={styles.chipPublished}>
											<CheckIcon className={styles.chipIcon} />
											Publicado
										</span>
									) : (
										<span className={styles.chipOff}>Sin publicar</span>
									)}
								</td>
								<td role="cell">
									<span className={styles.rowActions}>
										<Link
											className={styles.rowAction}
											href={`/admin/productos/${product.slug}`}
										>
											Editar
										</Link>
										<Link
											aria-label={`Ver ${product.name} en la tienda`}
											className={styles.rowIcon}
											href={`/catalogo/${product.slug}`}
										>
											<ChevronRightIcon className={styles.rowIconGlyph} />
										</Link>
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>

			{products.length === 0 ? (
				<p className={styles.empty}>
					Ningún producto coincide con estos filtros. Probá con otro nombre o
					quitá los filtros.
				</p>
			) : null}

			<div className={styles.tableFoot}>
				<p>
					{`${summary}: ${variants} variantes, ${published} publicados y ${low} con stock bajo.`}
				</p>
				<p className={styles.legend}>{featuredLegend(featured)}</p>
			</div>
		</>
	);
}
