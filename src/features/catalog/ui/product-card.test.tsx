import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductCard } from "./product-card";

const card = (priceFrom: number | null) =>
	renderToStaticMarkup(
		<ProductCard
			product={{ slug: "x", name: "Producto", category: "MAC", image: null, priceFrom }}
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
