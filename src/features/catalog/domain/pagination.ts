export const CATALOG_PAGE_SIZE = 12;

export type CatalogPage = {
	page: number;
	pageCount: number;
	skip: number;
	take: number;
};

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
