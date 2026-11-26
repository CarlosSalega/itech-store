import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createProduct, type AdminProduct } from "../domain/product";
import { ProductDetailScreen } from "./product-detail-screen";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: () => undefined }),
}));

const base = {
	name: 'Apple iPad Pro 11" M5 Space Black',
	description: null,
	category: "IPAD" as const,
	published: true,
	destacado: false,
	createdAt: "2026-11-24T10:00:00.000Z",
	variants: [{ label: "128 GB", priceCents: 120_000_000, stock: 6 }],
};

const photographed: AdminProduct = createProduct({
	...base,
	gallery: [
		{ position: 0, alt: "portada", url: "/products/ipad/pro-1.webp" },
		{ position: 1, alt: "segunda", url: "/products/ipad/pro-2.webp" },
	],
});

const bare: AdminProduct = createProduct(base);

const render = (product: AdminProduct) =>
	renderToStaticMarkup(
		<ProductDetailScreen initialProduct={product} slug={product.slug} />,
	);

describe("the gallery the product ficha shows", () => {
	it("shows every photograph of the gallery, in the order of the catalogue", () => {
		const markup = render(photographed);
		const first = markup.indexOf('src="/products/ipad/pro-1.webp"');
		const second = markup.indexOf('src="/products/ipad/pro-2.webp"');

		expect(first).toBeGreaterThan(-1);
		expect(second).toBeGreaterThan(first);
		expect(markup).toContain("2 fotos · la primera es la portada");
		expect(markup).toContain('alt="Apple iPad Pro 11&quot; M5 Space Black, foto 1"');
		expect(markup).toContain('alt="Apple iPad Pro 11&quot; M5 Space Black, foto 2"');
	});

	it("marks only the first photograph of the gallery as the cover", () => {
		const markup = render(photographed);

		expect(markup.match(/>Portada</g) ?? []).toHaveLength(1);
	});

	it("says the catalogue uses the sample image when the gallery is empty", () => {
		const markup = render(bare);

		expect(markup).toContain("0 fotos · la primera es la portada");
		expect(markup).toContain(
			"Este producto no tiene fotos cargadas: el catálogo usa la imagen de muestra.",
		);
	});

	it("keeps the published state the row carries on the screen", () => {
		expect(render(photographed)).toContain("Publicado");
		expect(render({ ...bare, published: false })).toContain("Sin publicar");
	});
});
