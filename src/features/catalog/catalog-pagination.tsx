import Link from "next/link";

import type { Category } from "@/generated/prisma/enums";

import { catalogHref } from "./catalog";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

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
					aria-label="Página anterior"
					className={styles.step}
					href={catalogHref({ family, page: page - 1 })}
					rel="prev"
				>
					<ChevronLeftIcon className={styles.stepIcon} />
				</Link>
			) : (
				/* No destination to offer, so there is nothing for the keyboard to land
				   on: the arrow stays for geometry but leaves the accessibility tree. */
				<span
					aria-hidden="true"
					className={`${styles.step} ${styles.inert}`}
				>
					<ChevronLeftIcon className={styles.stepIcon} />
				</span>
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

			{/* The narrow layout swaps the numbered strip for this, so the pager stays one
			   row at 320px. Hidden by CSS above the tablet breakpoint. */}
			<span className={styles.position}>
				<span className="sr-only">Página </span>
				{page}
				<span aria-hidden="true"> / </span>
				<span className="sr-only">de </span>
				{pageCount}
			</span>

			{page < pageCount ? (
				<Link
					aria-label="Página siguiente"
					className={styles.step}
					href={catalogHref({ family, page: page + 1 })}
					rel="next"
				>
					<ChevronRightIcon className={styles.stepIcon} />
				</Link>
			) : (
				<span
					aria-hidden="true"
					className={`${styles.step} ${styles.inert}`}
				>
					<ChevronRightIcon className={styles.stepIcon} />
				</span>
			)}
		</nav>
	);
}
