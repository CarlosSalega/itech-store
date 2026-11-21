import { describe, expect, it } from "vitest";

import { catalogHref, familyFromSlug, formatStorage, variantLabel } from "./catalog";

describe("familyFromSlug", () => {
	it("maps a valid lowercase slug to its category", () => {
		expect(familyFromSlug("mac")).toBe("MAC");
		expect(familyFromSlug("ipad")).toBe("IPAD");
		expect(familyFromSlug("watch")).toBe("WATCH");
		expect(familyFromSlug("airpods")).toBe("AIRPODS");
		expect(familyFromSlug("accessory")).toBe("ACCESSORY");
		expect(familyFromSlug("iphone")).toBe("IPHONE");
	});

	it("forgives stray whitespace and casing instead of dropping the filter", () => {
		expect(familyFromSlug(" Mac ")).toBe("MAC");
	});

	it("maps an unknown or empty value to no filter", () => {
		expect(familyFromSlug("macbook")).toBeNull();
		expect(familyFromSlug("")).toBeNull();
		expect(familyFromSlug("   ")).toBeNull();
		expect(familyFromSlug(undefined)).toBeNull();
	});

	it("maps a repeated parameter to no filter", () => {
		expect(familyFromSlug(["mac", "ipad"])).toBeNull();
	});
});

describe("catalogHref", () => {
	it("omits the page parameter on the first page", () => {
		expect(catalogHref({})).toBe("/catalogo");
		expect(catalogHref({ family: "MAC" })).toBe("/catalogo?familia=mac");
		expect(catalogHref({ family: "MAC", page: 1 })).toBe("/catalogo?familia=mac");
	});

	it("composes the family filter with the page number", () => {
		expect(catalogHref({ family: "MAC", page: 2 })).toBe(
			"/catalogo?familia=mac&page=2",
		);
	});

	it("keeps only the page when there is no family", () => {
		expect(catalogHref({ page: 3 })).toBe("/catalogo?page=3");
	});
});

describe("formatStorage", () => {
	it("separates the capacity from its unit", () => {
		expect(formatStorage("128GB")).toBe("128 GB");
		expect(formatStorage("1TB")).toBe("1 TB");
	});

	it("returns null when the variant carries no capacity", () => {
		expect(formatStorage(null)).toBeNull();
		expect(formatStorage("  ")).toBeNull();
	});
});

describe("variantLabel", () => {
	it("uses the capacity when there is one", () => {
		expect(variantLabel("256GB", null)).toBe("256 GB");
	});

	it("falls back to the colour, then to a single-presentation label", () => {
		expect(variantLabel(null, "Negro")).toBe("Negro");
		expect(variantLabel(null, null)).toBe("Única presentación");
	});
});
