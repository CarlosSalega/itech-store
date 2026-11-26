import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NewProductScreen } from "./new-product-screen";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: () => undefined }),
}));

vi.mock("../storage/product-store", () => ({
	commitProducts: () => undefined,
	getProductsServerSnapshot: () => [],
	getProductsSnapshot: () => [],
	subscribeProducts: () => () => undefined,
}));

const markup = renderToStaticMarkup(<NewProductScreen />);

const SLOT_IDS = ["nombre-message", "slug-message", "familia-message", "fotos-message"];

function slotText(id: string): string {
	const match = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</span>`).exec(markup);

	return (match?.[1] ?? "").replace(/<[^>]*>/g, "").trim();
}

describe("the room the product form reserves for its messages", () => {
	it("keeps one lane per top-level field, one per variant row and one for the photos", () => {
		const lanes = markup.match(/id="var-\d+-message"/g) ?? [];

		expect(lanes).toHaveLength(1);
		expect(markup.match(/aria-live="polite"/g)).toHaveLength(3 + 1 + lanes.length);

		for (const id of SLOT_IDS) {
			expect(markup).toContain(`id="${id}"`);
		}
	});

	it("describes every control with its standing note and its slot", () => {
		expect(markup).toMatch(/aria-describedby="nombre-help nombre-message"/);
		expect(markup).toMatch(/aria-describedby="slug-help slug-message"/);
		expect(markup).toMatch(/aria-describedby="familia-message"/);
		expect(markup.match(/aria-describedby="var-0-message"/g)).toHaveLength(2);
		expect(markup).toMatch(/aria-describedby="precio-0-help var-0-message"/);
	});

	it("marks nothing invalid and writes nothing while the draft is pristine", () => {
		expect(markup).not.toContain("aria-invalid");

		for (const id of SLOT_IDS) {
			expect(slotText(id)).toBe("");
		}
	});
});

describe("the photographs the form offers", () => {
	it("uploads and orders from the form itself", () => {
		expect(markup).toContain('id="fotos"');
		expect(markup).toContain("Elegir una foto");
		expect(markup).toContain('type="file"');
	});

	it("stops saying the photos are chosen somewhere else", () => {
		expect(markup).not.toContain("Las fotos se eligen en la ficha del producto");
		expect(markup).not.toContain("hasta que haya una propia");
	});

	it("keeps a notice that is still true, and the catalogue's own photos with it", () => {
		expect(markup).not.toContain("las fotos son las del catálogo de la demo");
		expect(markup).toContain("Las fotos que subís se guardan en la nube");
		expect(markup).toContain("el catálogo de la demo conserva las suyas");
	});
});
