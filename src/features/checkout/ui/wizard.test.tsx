import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { BUYER_FIELDS } from "../domain/order";
import { CheckoutWizard } from "./wizard";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: () => undefined }),
}));

vi.mock("./use-hydrated", () => ({
	useHydrated: () => true,
}));

vi.mock("../server/actions", () => ({
	placeOrderAction: async () => ({ ok: true, id: "cm_order", number: "IT-2026-0001" }),
}));

vi.mock("@/features/cart/ui/provider", () => ({
	useCart: () => ({
		cart: {
			lines: [
				{
					variantId: "v-ipad-256",
					sku: "apple-ipad-11-a16-chip-wi-fi-256gb",
					productSlug: "apple-ipad-11-a16-chip-wi-fi",
					productName: 'Apple iPad 11" A16 Chip WI-FI',
					familyLabel: "iPad",
					variantLabel: "Capacidad 256 GB",
					imageUrl: "/products/ipad/apple-ipad-11-a16-chip-wi-fi-1.webp",
					imageAlt: "Apple iPad 11 pulgadas A16 en azul, de frente",
					unitPriceCents: 103_500_000,
					quantity: 1,
					available: true,
				},
			],
			lastAddedVariantId: null,
		},
		openCart: () => undefined,
		totals: { lineCount: 1, unitCount: 1, totalCents: 103_500_000 },
	}),
}));

const markup = renderToStaticMarkup(<CheckoutWizard />);

function slotText(id: string): string {
	const match = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</span>`).exec(markup);

	return (match?.[1] ?? "").replace(/<[^>]*>/g, "").trim();
}

describe("the room the checkout reserves for the buyer messages", () => {
	it("keeps one announced slot per field of the datos step, before anything fails", () => {
		expect(markup.match(/aria-live="polite"/g)).toHaveLength(BUYER_FIELDS.length);

		for (const field of BUYER_FIELDS) {
			expect(markup).toContain(`id="buyer-${field}-message"`);
			expect(markup).toMatch(
				new RegExp(`aria-describedby="[^"]*buyer-${field}-message"`),
			);
		}
	});

	it("shows no message and no invalid field until the submit fails", () => {
		expect(markup).not.toContain("aria-invalid");

		for (const field of BUYER_FIELDS) {
			expect(slotText(`buyer-${field}-message`)).toBe("");
		}
	});
});
