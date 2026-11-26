import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductCard } from "./product-card";

const card = (
	priceFrom: number | null,
	image: string | null = null,
	imageAlt: string | null = null,
) =>
	renderToStaticMarkup(
		<ProductCard
			product={{
				slug: "x",
				name: "Producto",
				category: "MAC",
				image,
				imageAlt,
				priceFrom,
			}}
		/>,
	);

describe("ProductCard price split", () => {
	it.each([
		[0, "0"],
		[90000000, "900.000"],
		[103500000, "1.035.000"],
	])("renders the currency sign and the grouped amount for %i cents", (cents, amount) => {
		expect(card(cents)).toContain(`>$</span>${amount}</span>`);
	});

	it("keeps the to-confirm copy when there is no price", () => {
		expect(card(null)).toContain("Precio a confirmar");
	});
});

describe("ProductCard image label", () => {
	it("renders the gallery's image and the alt that names it", () => {
		const html = card(1000, "/products/mac/mac-1.webp", "Producto — foto principal");

		expect(html).toContain('src="/products/mac/mac-1.webp"');
		expect(html).toContain('alt="Producto — foto principal"');
	});

	it("keeps the product name as the label when the card carries no gallery alt", () => {
		const html = card(1000, "/products/mac/mac-1.webp");

		expect(html).toContain('alt="Producto"');
	});
});
