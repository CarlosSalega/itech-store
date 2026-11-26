import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ADMIN_ACTION_MESSAGES, type AdminActionResult } from "../server/product-actions";
import { ADMIN_PRODUCTS } from "../fixtures/products";
import type { ActionFeedback } from "./screen-actions";
import { NewProductScreen } from "./new-product-screen";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: () => undefined }),
}));

const success: AdminActionResult = { ok: true, slug: "apple-ipad-pro" };

function render(feedback?: ActionFeedback): string {
	return renderToStaticMarkup(
		<NewProductScreen
			create={async () => success}
			initialFeedback={feedback}
			products={ADMIN_PRODUCTS}
		/>,
	);
}

const markup = render();

const SLOT_IDS = ["nombre-message", "slug-message", "familia-message", "fotos-message"];

function slotText(html: string, id: string): string {
	const match = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</span>`).exec(html);

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
			expect(slotText(markup, id)).toBe("");
		}
	});
});

describe("the save lane while the form is saving", () => {
	it("says it is saving and disables the button", () => {
		const pending = render({ pending: true, message: null });

		expect(pending).toContain("Guardando el producto…");
		expect(pending).toContain("Guardando…");
		expect(pending).toMatch(/<button[^>]*disabled[^>]*>Guardando…<\/button>/);
		expect(pending).not.toContain("Todo listo para guardar el producto.");
	});
});

describe("the refusals the action writes into the save lane", () => {
	for (const [code, message] of Object.entries(ADMIN_ACTION_MESSAGES)) {
		it(`shows the action's message for ${code}`, () => {
			const refused = render({ pending: false, message });

			expect(refused).toContain(message);
			expect(refused).not.toContain("Todo listo para guardar el producto.");
		});
	}
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

	it("says where the product and its photos are saved", () => {
		expect(markup).not.toContain("se guarda en este navegador");
		expect(markup).not.toContain("los datos de este panel son de ejemplo");
		expect(markup).toContain("El producto se guarda en la base de datos.");
		expect(markup).toContain("Las fotos que subís se guardan en la nube");
	});
});
