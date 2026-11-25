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

const SLOT_IDS = ["nombre-message", "slug-message", "familia-message"];

function slotText(id: string): string {
	const match = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</span>`).exec(markup);

	return (match?.[1] ?? "").replace(/<[^>]*>/g, "").trim();
}

describe("the room the product form reserves for its messages", () => {
	it("keeps one lane per top-level field and one per variant row", () => {
		const lanes = markup.match(/id="var-\d+-message"/g) ?? [];

		expect(lanes).toHaveLength(1);
		expect(markup.match(/aria-live="polite"/g)).toHaveLength(3 + lanes.length);

		for (const id of SLOT_IDS.slice(0, 3)) {
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
