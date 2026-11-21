import { describe, expect, it } from "vitest";

import {
	categoryFromName,
	normaliseName,
	REQUESTED_APPLE_PRODUCTS,
	selectRequested,
	skuFor,
	slugFromName,
	storagesFromName,
} from "./apple-catalogue";

const REQUESTED = REQUESTED_APPLE_PRODUCTS;

describe("REQUESTED_APPLE_PRODUCTS", () => {
	it("resolves every requested product to a family", () => {
		expect(REQUESTED.length).toBeGreaterThan(0);

		for (const name of REQUESTED) {
			expect(categoryFromName(name), name).not.toBeNull();
		}
	});

	it("never carries a null name, so the list cannot be padded to pass the check above", () => {
		for (const name of REQUESTED) {
			expect(typeof name).toBe("string");
			expect(name.trim()).not.toBe("");
		}
	});
});

describe("categoryFromName", () => {
	it("places every requested product in the family that sells it", () => {
		expect(categoryFromName("iPhone 18 Pro - 256 GB")).toBe("IPHONE");
		expect(categoryFromName("iPhone 18 Pro Max")).toBe("IPHONE");
		expect(categoryFromName("iPhone Duo 256 - 512 GB")).toBe("IPHONE");
		expect(categoryFromName("Apple Watch SE 3 40mm")).toBe("WATCH");
		expect(categoryFromName("Apple Watch SE 3 40mm Starlight")).toBe("WATCH");
		expect(categoryFromName("Apple Pencil Pro")).toBe("ACCESSORY");
		expect(categoryFromName("Apple PENCIL USB-C")).toBe("ACCESSORY");
		expect(categoryFromName("Apple Adaptador 20w original")).toBe("ACCESSORY");
	});

	it("treats a keyboard for an iPad as an accessory, not as an iPad", () => {
		expect(categoryFromName("Apple Magic Keyboard iPad White")).toBe("ACCESSORY");
	});

	it("files a phone case and a screen protector as accessories, not as phones", () => {
		expect(categoryFromName("Funda iPhone 17 Pro")).toBe("ACCESSORY");
		expect(categoryFromName("Protector de pantalla iPhone 16")).toBe("ACCESSORY");
	});

	it("returns null for anything that is not an Apple product", () => {
		expect(categoryFromName("Sony Play Station 5 Digital 825GB")).toBeNull();
		expect(categoryFromName("Cargador – generico – 20w")).toBeNull();
		expect(categoryFromName("")).toBeNull();
	});

	it("keeps the families apart for the models that already exist", () => {
		expect(categoryFromName("Apple iPad A16 256GB Blue")).toBe("IPAD");
		expect(categoryFromName('Apple 13" MacBook Neo - A18 Pro')).toBe("MAC");
		expect(categoryFromName("Apple Airpods Pro 3")).toBe("AIRPODS");
	});
});

describe("slugFromName", () => {
	it("derives a stable kebab address from the product name", () => {
		expect(slugFromName("iPhone 18 Pro - 256 GB")).toBe("iphone-18-pro-256-gb");
		expect(slugFromName('Apple 13" iPad Air M4 Blue')).toBe("13-ipad-air-m4-blue");
	});

	it("drops the brand article, because the whole store is Apple", () => {
		expect(slugFromName("Apple Pencil Pro")).toBe("pencil-pro");
		expect(slugFromName("Apple PENCIL USB-C")).toBe("pencil-usb-c");
		expect(slugFromName("Apple Watch SE 3 40mm Starlight")).toBe(
			"watch-se-3-40mm-starlight",
		);
	});

	it("strips accents and never leaves a double or trailing dash", () => {
		expect(slugFromName("Apple Cargador – genérico – 20w  ")).toBe(
			"cargador-generico-20w",
		);
		expect(slugFromName("Caja  Sellada / Garantía")).toBe(
			"caja-sellada-garantia",
		);
	});

	it("collapses a brand prefix typed twice into one address", () => {
		expect(slugFromName("Apple Apple Watch SE 3 40mm")).toBe("watch-se-3-40mm");
	});
});

describe("storagesFromName", () => {
	it("reads the capacity a product is sold by", () => {
		expect(storagesFromName("iPhone 18 Pro - 256 GB")).toEqual(["256GB"]);
	});

	it("reads a range as the two capacities it offers", () => {
		expect(storagesFromName("iPhone Duo 256 - 512 GB")).toEqual(["256GB", "512GB"]);
	});

	it("reports no capacity for a product that is not sold by capacity", () => {
		expect(storagesFromName("Apple Watch SE 3 40mm Starlight")).toEqual([]);
		expect(storagesFromName("Apple Pencil Pro")).toEqual([]);
		expect(storagesFromName("Apple Adaptador 20w original")).toEqual([]);
	});
});

describe("skuFor", () => {
	it("keeps the slug alone when the product has no capacity", () => {
		expect(skuFor("pencil-pro", null)).toBe("pencil-pro");
	});

	it("qualifies the slug with the capacity, without punctuation", () => {
		expect(skuFor("iphone-18-pro-256-gb", "256GB")).toBe(
			"iphone-18-pro-256-gb-256gb",
		);
		expect(skuFor("iphone-duo-256-512-gb", "512GB")).toBe(
			"iphone-duo-256-512-gb-512gb",
		);
	});
});

describe("normaliseName", () => {
	it("compares names by words, ignoring case, punctuation and spacing", () => {
		expect(normaliseName("Apple PENCIL USB-C")).toBe(normaliseName("Apple Pencil USB C"));
		expect(normaliseName("Cargador – generico – 20w")).toBe(
			normaliseName("cargador generico 20w"),
		);
	});

	it("reads a brand prefix typed twice as the same product", () => {
		expect(normaliseName("Apple Apple Watch SE 3 40mm")).toBe(
			normaliseName("Apple Watch SE 3 40mm"),
		);
		expect(normaliseName("APPLE APPLE Apple Pencil Pro")).toBe(
			normaliseName("Apple Pencil Pro"),
		);
	});
});

describe("selectRequested", () => {
	it("selects exactly the requested products that the source actually lists", () => {
		const source = [...REQUESTED, "Apple iPhone 16 128GB White", "Sony Play Station 5"];
		const result = selectRequested(source, REQUESTED);

		expect(result.present).toHaveLength(REQUESTED.length);
		expect(result.missing).toEqual([]);
		expect(result.present).not.toContain("Apple iPhone 16 128GB White");
	});

	it("reports a requested product the source no longer lists instead of silently dropping it", () => {
		const source = ["Apple Pencil Pro"];
		const result = selectRequested(source, REQUESTED);

		expect(result.present).toEqual(["Apple Pencil Pro"]);
		expect(result.missing).toHaveLength(REQUESTED.length - 1);
		expect(result.missing).toContain("iPhone 18 Pro Max");
	});

	it("matches a requested name despite a different spelling of case and dashes", () => {
		const result = selectRequested(["apple pencil usb c"], ["Apple PENCIL USB-C"]);

		expect(result.present).toEqual(["Apple PENCIL USB-C"]);
		expect(result.missing).toEqual([]);
	});

	it("matches a requested name the source lists with a doubled brand prefix", () => {
		const result = selectRequested(
			["Apple Apple Watch SE 3 40mm", "Apple Apple Magic Keyboard iPad White"],
			["Apple Watch SE 3 40mm", "Apple Magic Keyboard iPad White"],
		);

		expect(result.present).toEqual([
			"Apple Watch SE 3 40mm",
			"Apple Magic Keyboard iPad White",
		]);
		expect(result.missing).toEqual([]);
	});

	it("does not select the same product twice when the source repeats a name", () => {
		const repeated = ["Apple Pencil Pro", "Apple  Pencil Pro"];
		const result = selectRequested(repeated, ["Apple Pencil Pro"]);

		expect(result.present).toEqual(["Apple Pencil Pro"]);
	});
});
