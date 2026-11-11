import Link from "next/link";

import type { Category } from "@/generated/prisma/enums";

import { catalogHref } from "./catalog";

import styles from "./catalog-pagination.module.css";

type CatalogPaginationProps = {
	/** The family being filtered, kept in every page link. */
	family: Category | null;
	/** The page that is rendered (already clamped). */
	page: number;
	pageCount: number;
};

/**
 * Real URL pagination: every page is a plain link, so the pager works with the
 * keyboard, with the middle mouse button and with a shared URL.
 */
export function CatalogPagination({
	family,
	page,
	pageCount,
}: CatalogPaginationProps) {
	const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

	return (
		<nav className={styles.pager} aria-label="Paginación del catálogo">
			{page > 1 ? (
				<Link
					className={styles.step}
					href={catalogHref({ family, page: page - 1 })}
					rel="prev"
				>
					Anterior
				</Link>
			) : (
				<span className={`${styles.step} ${styles.inert}`}>Anterior</span>
			)}

			<ol className={styles.pages}>
				{pages.map((number) => (
					<li key={number}>
						{number === page ? (
							<span aria-current="page" className={styles.current}>
								<span className="sr-only">Página </span>
								{number}
							</span>
						) : (
							<Link
								aria-label={`Página ${number}`}
								className={styles.page}
								href={catalogHref({ family, page: number })}
							>
								{number}
							</Link>
						)}
					</li>
				))}
			</ol>

			{page < pageCount ? (
				<Link
					className={styles.step}
					href={catalogHref({ family, page: page + 1 })}
					rel="next"
				>
					Siguiente
				</Link>
			) : (
				<span className={`${styles.step} ${styles.inert}`}>Siguiente</span>
			)}
		</nav>
	);
}
