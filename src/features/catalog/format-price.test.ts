import { describe, expect, it } from "vitest";

import { formatArsPrice } from "./format-price";

describe("formatArsPrice", () => {
	it("formats a price in the hundreds of thousands", () => {
		expect(formatArsPrice(90000000)).toBe("$ 900.000");
	});

	it("separates amounts above one million", () => {
		expect(formatArsPrice(103500000)).toBe("$ 1.035.000");
	});

	it("separates amounts below one hundred thousand", () => {
		expect(formatArsPrice(3000000)).toBe("$ 30.000");
	});

	it("formats the top of the seeded price range", () => {
		expect(formatArsPrice(270000000)).toBe("$ 2.700.000");
	});

	it("formats zero without decimals", () => {
		expect(formatArsPrice(0)).toBe("$ 0");
	});
});
