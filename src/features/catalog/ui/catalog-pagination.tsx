import Link from "next/link";

import type { Category } from "@/generated/prisma/enums";

import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

import { catalogHref } from "../domain/catalog";

import styles from "./catalog-pagination.module.css";

type CatalogPaginationProps = {
	family: Category | null;
	page: number;
	pageCount: number;
};

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
