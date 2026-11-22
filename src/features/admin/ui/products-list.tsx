"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore, type CSSProperties } from "react";

import { SearchIcon } from "@/components/icons";
import { FAMILY_LABEL, NAV_FAMILIES } from "@/features/catalog/domain/catalog";

import type { AdminProduct } from "../domain/product";
import {
	PRODUCT_STATUS_FILTERS,
	filterAdminProducts,
	productFilterHref,
	productFiltersFromParams,
	productStatusCounts,
	productStatusLabel,
	type ProductFilters,
	type ProductStatusFilter,
} from "../domain/product-filters";
import { getProductsSnapshot, subscribeProducts } from "../storage/product-store";
import { ChevronDownIcon } from "./icons";
import { ProductsTable } from "./products-table";
import { AdminScreen, ScreenFoot } from "./screen";

import styles from "./products.module.css";

export function ProductsList({
	initialProducts,
}: {
	initialProducts: readonly AdminProduct[];
}) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const products = useSyncExternalStore(
		subscribeProducts,
		getProductsSnapshot,
		() => initialProducts,
	);
	const urlFilters = productFiltersFromParams(
		Object.fromEntries(searchParams.entries()),
	);
	const urlHref = productFilterHref(urlFilters);
	const [view, setView] = useState({ filters: urlFilters, href: urlHref });

	if (view.href !== urlHref) {
		setView({ filters: urlFilters, href: urlHref });
	}

	const filters = view.filters;
	const visible = filterAdminProducts(products, filters);
	const counts = productStatusCounts(products);

	const apply = (next: ProductFilters) => {
		const href = productFilterHref(next);

		setView({ filters: next, href });
		router.replace(href, { scroll: false });
	};

	const variants = products.reduce(
		(sum, product) => sum + product.variants.length,
		0,
	);

	return (
		<AdminScreen>
			<div className={`${styles.head} ${styles.enter}`}>
				<div>
					<h1 className={styles.title}>Productos</h1>
					<p className={styles.deck}>
						El catálogo completo, con las variantes, los precios y el stock de cada
						producto.
					</p>
				</div>
			</div>

			<div className={`${styles.toolbar} ${styles.enter}`} style={delay(1)}>
				<div className={styles.searchField}>
					<SearchIcon className={styles.searchIcon} />
					<label className="sr-only" htmlFor="productos-q">
						Buscar productos por nombre o SKU
					</label>
					<input
						id="productos-q"
						onChange={(event) => apply({ ...filters, query: event.target.value })}
						placeholder="Buscar por nombre o SKU"
						type="search"
						value={filters.query}
					/>
				</div>

				<div className={styles.filter}>
					<label htmlFor="productos-familia">Familia</label>
					<select
						id="productos-familia"
						onChange={(event) =>
							apply({
								...filters,
								family:
									event.target.value === ""
										? null
										: (event.target.value as AdminProduct["category"]),
							})
						}
						value={filters.family ?? ""}
					>
						<option value="">Todas las familias</option>
						{NAV_FAMILIES.map((family) => (
							<option key={family} value={family}>
								{FAMILY_LABEL[family]}
							</option>
						))}
					</select>
					<ChevronDownIcon className={styles.filterChevron} />
				</div>

				<div className={styles.filter}>
					<label htmlFor="productos-estado">Estado</label>
					<select
						id="productos-estado"
						onChange={(event) =>
							apply({
								...filters,
								status: event.target.value as ProductStatusFilter,
							})
						}
						value={filters.status}
					>
						{PRODUCT_STATUS_FILTERS.map((status) => (
							<option key={status} value={status}>
								{productStatusLabel(status, counts[status])}
							</option>
						))}
					</select>
					<ChevronDownIcon className={styles.filterChevron} />
				</div>

				<Link className={styles.primary} href="/admin/productos/nuevo">
					Nuevo producto
				</Link>
			</div>

			<div className={`${styles.tableWrap} ${styles.enter}`} style={delay(2)}>
				<ProductsTable products={visible} totalCount={products.length} />
			</div>

			<ScreenFoot
				notice={`Los datos de este panel son de ejemplo: los ${products.length} productos y las ${variants} variantes del catálogo de la demo. Los precios son de muestra y no son precios de venta.`}
				routes="/admin/productos · /admin/productos/nuevo · /admin/productos/[slug]"
			/>
		</AdminScreen>
	);
}

function delay(index: number) {
	return { "--i": index } as CSSProperties;
}
