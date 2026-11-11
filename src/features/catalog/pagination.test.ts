import { describe, expect, it } from "vitest";

import { CATALOG_PAGE_SIZE, paginatePage } from "./pagination";

describe("paginatePage", () => {
	it("returns the first page of a 64 product catalog at 12 per page", () => {
		expect(paginatePage(1, 64, CATALOG_PAGE_SIZE)).toEqual({
			page: 1,
			pageCount: 6,
			skip: 0,
			take: 12,
		});
	});

	it("returns the last page, which holds the remainder", () => {
		// 64 = 5 full pages of 12 plus a partial sixth page of 4 products.
		expect(paginatePage(6, 64, CATALOG_PAGE_SIZE)).toEqual({
			page: 6,
			pageCount: 6,
			skip: 60,
			take: 12,
		});
		// The take stays at the page size: the database returns what exists.
		expect(paginatePage(3, 25, 12)).toEqual({
			page: 3,
			pageCount: 3,
			skip: 24,
			take: 12,
		});
	});

	it("clamps an out-of-range page to the last page", () => {
		expect(paginatePage(99, 64, CATALOG_PAGE_SIZE)).toEqual({
			page: 6,
			pageCount: 6,
			skip: 60,
			take: 12,
		});
	});

	it("reports a single empty page when the query has no results", () => {
		expect(paginatePage(1, 0, CATALOG_PAGE_SIZE)).toEqual({
			page: 1,
			pageCount: 1,
			skip: 0,
			take: 12,
		});
		expect(paginatePage(4, 0, CATALOG_PAGE_SIZE)).toEqual({
			page: 1,
			pageCount: 1,
			skip: 0,
			take: 12,
		});
	});

	it("clamps page 0 and negative pages to the first page", () => {
		expect(paginatePage(0, 64, CATALOG_PAGE_SIZE).page).toBe(1);
		expect(paginatePage(0, 64, CATALOG_PAGE_SIZE).skip).toBe(0);
		expect(paginatePage(-7, 64, CATALOG_PAGE_SIZE).page).toBe(1);
		expect(paginatePage(-7, 64, CATALOG_PAGE_SIZE).skip).toBe(0);
	});

	it("treats a non-numeric page as the first page", () => {
		expect(paginatePage(Number.NaN, 64, CATALOG_PAGE_SIZE).page).toBe(1);
	});
});
