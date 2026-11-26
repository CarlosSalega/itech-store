import { describe, expect, it } from "vitest";

import {
	CLOUD_NAME_PLACEHOLDER,
	createImageUrlResolver,
	DEFAULT_IMAGE_FALLBACK,
	DEFAULT_VARIANTS,
	getPublicIdFromUrl,
} from "./index";

const base = `https://res.cloudinary.com/${CLOUD_NAME_PLACEHOLDER}/image/upload`;

describe("createImageUrlResolver", () => {
	it("substitutes the cloud name and the named transform", () => {
		const resolver = createImageUrlResolver({ base, cloudName: "demo" });

		expect(resolver.resolve("products/abc", "card")).toBe(
			"https://res.cloudinary.com/demo/image/upload/w_400,h_300,c_fill,f_auto,q_auto,dpr_auto/products/abc",
		);
		expect(resolver.resolve("products/abc", "thumbnail")).toBe(
			"https://res.cloudinary.com/demo/image/upload/w_300,h_225,c_fill,f_auto,q_auto,dpr_auto/products/abc",
		);
	});

	it("uses the first variant when the caller omits one, and honours defaultVariant", () => {
		const resolver = createImageUrlResolver({ base, cloudName: "demo" });

		expect(resolver.resolve("products/abc")).toContain(
			"/w_300,h_225,c_fill,f_auto,q_auto,dpr_auto/",
		);
		expect(
			createImageUrlResolver({ base, cloudName: "demo", defaultVariant: "detail" }).resolve(
				"products/abc",
			),
		).toContain("/w_800,h_600,c_fill,f_auto,q_auto,dpr_auto/");
	});

	it("strips the stored extension and the trailing slashes of the base", () => {
		const resolver = createImageUrlResolver({ base: `${base}/`, cloudName: "demo" });

		expect(resolver.resolve("products/abc.webp", "thumbnail")).toBe(
			"https://res.cloudinary.com/demo/image/upload/w_300,h_225,c_fill,f_auto,q_auto,dpr_auto/products/abc",
		);
	});

	it("returns the fallback instead of throwing when the input is incomplete", () => {
		const resolver = createImageUrlResolver({ base, cloudName: "demo" });

		expect(resolver.resolve("")).toBe(DEFAULT_IMAGE_FALLBACK);
		expect(resolver.resolve("products/abc", "nope" as never)).toBe(DEFAULT_IMAGE_FALLBACK);
		expect(createImageUrlResolver({ base }).resolve("products/abc", "thumbnail")).toBe(
			DEFAULT_IMAGE_FALLBACK,
		);
		expect(createImageUrlResolver({ cloudName: "demo" }).resolve("products/abc")).toBe(
			DEFAULT_IMAGE_FALLBACK,
		);
		expect(
			createImageUrlResolver({ base: "https://cdn/x", fallback: "/sin-foto.webp" }).resolve(""),
		).toBe("/sin-foto.webp");
	});

	it("works against a complete CDN base that needs no cloud name", () => {
		expect(
			createImageUrlResolver({ base: "https://cdn.example.com/products" }).resolve(
				"abc",
				"thumbnail",
			),
		).toBe(
			"https://cdn.example.com/products/w_300,h_225,c_fill,f_auto,q_auto,dpr_auto/abc",
		);
	});

	it("uses the provided custom variants", () => {
		const resolver = createImageUrlResolver({
			base: "https://cdn.example.com",
			variants: { hero: "w_1600", grid: "w_400" },
			defaultVariant: "grid",
		});

		expect(resolver.resolve("p/1", "hero")).toBe("https://cdn.example.com/w_1600/p/1");
		expect(resolver.resolve("p/1")).toBe("https://cdn.example.com/w_400/p/1");
	});

	it("builds a plain base/key URL when there is no transform layer", () => {
		const resolver = createImageUrlResolver({
			base: "https://cdn.example.com/products",
			variantPlacement: "none",
			stripExtension: false,
		});

		expect(resolver.resolve("abc.webp")).toBe("https://cdn.example.com/products/abc.webp");
		expect(resolver.resolve("abc.webp", "card")).toBe("https://cdn.example.com/products/abc.webp");
	});

	it("substitutes the cloud name outside the path too", () => {
		expect(
			createImageUrlResolver({
				base: `https://${CLOUD_NAME_PLACEHOLDER}.cdn.example.com/products`,
				cloudName: "acme",
				variantPlacement: "none",
				stripExtension: false,
			}).resolve("abc.webp"),
		).toBe("https://acme.cdn.example.com/products/abc.webp");
	});

	it("exposes the variants it resolves against", () => {
		const resolver = createImageUrlResolver({ base, cloudName: "demo" });

		expect(resolver.variants).toEqual(DEFAULT_VARIANTS);
	});
});

describe("getPublicIdFromUrl", () => {
	it("recovers the key, dropping the version segment and the extension", () => {
		expect(
			getPublicIdFromUrl(
				"https://res.cloudinary.com/demo/image/upload/v1712345678/products/abc.webp",
			),
		).toBe("products/abc");
		expect(
			getPublicIdFromUrl("https://res.cloudinary.com/demo/image/upload/products/abc.png"),
		).toBe("products/abc");
		expect(getPublicIdFromUrl("https://res.cloudinary.com/demo/image/upload/products/abc")).toBe(
			"products/abc",
		);
	});

	it("returns the fallback for anything that is not a delivery URL", () => {
		expect(getPublicIdFromUrl("")).toBe("placeholder");
		expect(getPublicIdFromUrl("https://cdn.example.com/products/abc.png")).toBe("placeholder");
		expect(getPublicIdFromUrl("https://res.cloudinary.com/demo/image/upload")).toBe("placeholder");
		expect(getPublicIdFromUrl("https://res.cloudinary.com/demo/image/upload/")).toBe("placeholder");
		expect(getPublicIdFromUrl("not a url")).toBe("placeholder");
	});

	it("honours a custom fallback and host", () => {
		expect(getPublicIdFromUrl("nope", { fallback: "missing" })).toBe("missing");
		expect(
			getPublicIdFromUrl("https://cdn.example.com/upload/v1/p/1.webp", { host: "cdn.example.com" }),
		).toBe("p/1");
	});

	it("takes the whole path as the key when no marker segment is configured", () => {
		expect(
			getPublicIdFromUrl("https://cdn.example.com/products/abc.webp", {
				host: "cdn.example.com",
				afterSegment: null,
			}),
		).toBe("products/abc");
		expect(
			getPublicIdFromUrl("https://cdn.example.com/products/abc.webp", {
				host: "cdn.example.com",
				afterSegment: null,
				stripExtension: false,
			}),
		).toBe("products/abc.webp");
	});

	it("keeps the version segment when version stripping is disabled", () => {
		expect(
			getPublicIdFromUrl("https://res.cloudinary.com/demo/image/upload/v171/products/abc.webp", {
				stripVersion: false,
			}),
		).toBe("v171/products/abc");
	});

	it("still requires the marker segment when one is configured", () => {
		expect(
			getPublicIdFromUrl("https://cdn.example.com/products/abc.webp", { host: "cdn.example.com" }),
		).toBe("placeholder");
	});
});
