import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ProductDetail } from "@/features/catalog/server/catalog-queries";

import ProductoPage, { generateMetadata } from "./page";

const queries = vi.hoisted(() => ({
	findProductBySlug: vi.fn(),
	listRelatedProducts: vi.fn(async () => []),
}));

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
	},
}));
vi.mock("@/features/catalog/server/catalog-queries", () => ({
	findProductBySlug: queries.findProductBySlug,
	listRelatedProducts: queries.listRelatedProducts,
}));
vi.mock("@/features/cart/ui/provider", () => ({
	CartProvider: ({ children }: { children: unknown }) => children,
	useCart: () => ({ totals: { unitCount: 0 }, isOpen: false, openCart: () => {} }),
}));

const IPHONE_17: ProductDetail = {
	slug: "iphone-17",
	name: "iPhone 17",
	description: "El iPhone 17, con chip A19.",
	category: "IPHONE",
	gallery: [
		{
			url: "/products/iphone/iphone-17-1.webp",
			alt: "iPhone 17 — foto principal",
		},
		{ url: "/products/iphone/iphone-17-2.webp", alt: "iPhone 17 — foto 2" },
		{ url: "/products/iphone/iphone-17-3.webp", alt: "iPhone 17 — foto 3" },
	],
	variants: [
		{
			id: "v-iphone-256",
			sku: "iphone-17-256-negro",
			storage: "256 GB",
			color: "Negro",
			price: 150000000,
			stock: 3,
		},
	],
};

queries.findProductBySlug.mockImplementation(async (slug: string) =>
	slug === IPHONE_17.slug ? IPHONE_17 : null,
);

async function markup(slug: string): Promise<string> {
	return renderToStaticMarkup(
		await ProductoPage({ params: Promise.resolve({ slug }) }),
	);
}

describe("the product page reads the gallery", () => {
	it("takes the first image by position and its alt into the figure", async () => {
		const html = await markup("iphone-17");
		const figure = /<figure[^>]*>[\s\S]*?<\/figure>/.exec(html)?.[0] ?? "";

		expect(figure).toContain('src="/products/iphone/iphone-17-1.webp"');
		expect(figure).toContain('alt="iPhone 17 — foto principal"');
	});

	it("keeps the figure image first and the thumbnails in position order", async () => {
		const html = await markup("iphone-17");
		const sources = [...html.matchAll(/<img[^>]*src="(\/products\/[^"]+)"/g)].map(
			(match) => match[1],
		);

		expect(sources).toEqual([
			"/products/iphone/iphone-17-1.webp",
			"/products/iphone/iphone-17-1.webp",
			"/products/iphone/iphone-17-2.webp",
			"/products/iphone/iphone-17-3.webp",
		]);
	});
});

describe("the product page does not reach an unpublished product", () => {
	it("answers not found instead of rendering the page", async () => {
		await expect(markup("iphone-17-borrador")).rejects.toThrow(
			"NEXT_HTTP_ERROR_FALLBACK;404",
		);
	});

	it("answers not found in the metadata as well", async () => {
		const metadata = await generateMetadata({
			params: Promise.resolve({ slug: "iphone-17-borrador" }),
		});

		expect(metadata.title).toBe("Producto no encontrado — iTech Store");
	});
});
