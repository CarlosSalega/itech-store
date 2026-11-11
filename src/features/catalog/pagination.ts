/**
 * URL pagination for `/catalogo`.
 *
 * The page number lives in the URL (`?page=N`) so every page is a shareable,
 * indexable address, and the offset is computed here instead of in the route.
 *
 * Two behaviours are deliberate and user-visible:
 *
 * 1. An out-of-range `page` clamps to the last page instead of erroring, so a
 *    stale link (for example `?page=99`, or a page that had results before the
 *    catalog shrank) still renders the catalog instead of a 404.
 * 2. A query with zero results still reports one page: the page count is never
 *    zero, so the pager can render "1 de 1" over an honest empty state.
 */
export const CATALOG_PAGE_SIZE = 12;

export type CatalogPage = {
	/** The clamped page that is actually rendered. */
	page: number;
	/** Total pages, never below 1. */
	pageCount: number;
	/** Rows to skip for Prisma. */
	skip: number;
	/** Page size handed to Prisma, also on a partial last page. */
	take: number;
};

/**
 * Clamps the requested page into the real range and turns it into `skip`/`take`.
 */
export function paginatePage(
	requestedPage: number,
	totalCount: number,
	pageSize: number,
): CatalogPage {
	const size = Math.max(1, Math.trunc(pageSize) || 1);
	const total = Math.max(0, Math.trunc(totalCount) || 0);
	const pageCount = Math.max(1, Math.ceil(total / size));
	const requested = Math.trunc(requestedPage) || 1;
	const page = Math.min(pageCount, Math.max(1, requested));

	return { page, pageCount, skip: (page - 1) * size, take: size };
}
