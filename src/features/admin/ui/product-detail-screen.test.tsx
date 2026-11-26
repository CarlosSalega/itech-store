import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { createProduct, type AdminProduct } from "../domain/product";
import { ADMIN_ACTION_MESSAGES, type AdminActionResult } from "../server/product-actions";
import {
	ProductDetailScreen,
} from "./product-detail-screen";
import type { ActionFeedback, ProductDetailActions } from "./screen-actions";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: () => undefined }),
}));

const success: AdminActionResult = { ok: true, slug: "apple-ipad-pro-11-m5-space-black" };

const actions: ProductDetailActions = {
	update: async () => success,
	publish: async () => success,
	unpublish: async () => success,
	remove: async () => success,
};

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

const render = (
	product: AdminProduct,
	feedback?: ActionFeedback,
	productId: string | null = "product-1",
) =>
	renderToStaticMarkup(
		<ProductDetailScreen
			actions={actions}
			initialFeedback={feedback}
			initialProduct={product}
			productId={productId}
		/>,
	);

describe("the gallery the product ficha edits", () => {
	it("shows every photograph of the gallery, in the order of the catalogue", () => {
		const markup = render(photographed);
		const first = markup.indexOf('src="/products/ipad/pro-1.webp"');
		const second = markup.indexOf('src="/products/ipad/pro-2.webp"');

		expect(first).toBeGreaterThan(-1);
		expect(second).toBeGreaterThan(first);
		expect(markup).toContain("2 fotos · la primera es la portada");
		expect(markup).toContain('value="portada"');
		expect(markup).toContain('value="segunda"');
	});

	it("offers the controls and the save the database write needs", () => {
		const markup = render(photographed);

		expect(markup).toContain("Elegir una foto");
		expect(markup).toContain("Guardar fotos");
		expect(markup).toContain("Texto alternativo");
	});

	it("says the catalogue uses the sample image when the gallery is empty", () => {
		const markup = render(bare);

		expect(markup).toContain("0 fotos · la primera es la portada");
		expect(markup).toContain(
			"Todavía no hay fotos: el catálogo usa la imagen de muestra hasta que subas una.",
		);
	});

	it("keeps the published state the row carries on the screen", () => {
		expect(render(photographed)).toContain("Publicado");
		expect(render({ ...bare, published: false })).toContain("Sin publicar");
	});
});

describe("the lane the detail screen reserves for its actions", () => {
	it("says it is saving while an action is in flight", () => {
		const pending = render(photographed, { pending: true, message: null });

		expect(pending).toContain("Guardando los cambios…");
		expect(pending).toContain('id="accion-message"');
	});

	for (const [code, message] of Object.entries(ADMIN_ACTION_MESSAGES)) {
		it(`shows the action's message for ${code}`, () => {
			const refused = render(photographed, { pending: false, message });

			expect(refused).toContain(`id="accion-message"`);
			expect(refused).toContain(message);
		});
	}

	it("stops saying the product is from a demo and deleted in this browser", () => {
		const markup = renderToStaticMarkup(
			<ProductDetailScreen
				actions={actions}
				initialProduct={null}
				productId={null}
			/>,
		);

		expect(markup).not.toContain("catálogo de la demo");
		expect(markup).not.toContain("en este navegador");
		expect(render(photographed)).not.toContain("se guardan en este navegador");
	});
});
