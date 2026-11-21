import { describe, expect, it } from "vitest";

import { skuFor, storageKey } from "./sku";

describe("skuFor", () => {
	it("appends the capacity with non-alphanumerics stripped and lowercased", () => {
		expect(skuFor("iphone-15-pro", "128GB")).toBe("iphone-15-pro-128gb");
		expect(skuFor("iphone-15-pro", "1 TB")).toBe("iphone-15-pro-1tb");
		expect(skuFor("iphone-15-pro", "256 gb")).toBe("iphone-15-pro-256gb");
		expect(skuFor("iphone-duo-256-512-gb", "512GB")).toBe("iphone-duo-256-512-gb-512gb");
	});

	it("returns the bare slug when there is no capacity", () => {
		expect(skuFor("iphone-15-pro", null)).toBe("iphone-15-pro");
		expect(skuFor("pencil-pro", null)).toBe("pencil-pro");
	});

	it("returns the bare slug when the capacity carries nothing", () => {
		expect(skuFor("pencil-pro", " ")).toBe("pencil-pro");
		expect(skuFor("pencil-pro", "--")).toBe("pencil-pro");
		expect(skuFor("pencil-pro", "")).toBe("pencil-pro");
	});
});

describe("storageKey", () => {
	it("keeps only letters and digits, lowercased", () => {
		expect(storageKey("1 TB")).toBe("1tb");
		expect(storageKey("256 GB")).toBe("256gb");
	});

	it("is empty when the capacity carries nothing", () => {
		expect(storageKey(" ")).toBe("");
		expect(storageKey("-–_")).toBe("");
	});
});
