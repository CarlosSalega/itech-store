import { describe, expect, it } from "vitest";

import {
	ORDER_PROOF_COOKIE,
	ORDER_PROOF_LIMIT,
	hasOrderProof,
	orderProofCookieOptions,
	parseOrderProofs,
	rememberOrderProof,
} from "./order-proof";

describe("the cookie that proves a receipt", () => {
	it("remembers the newest order first and never repeats an id", () => {
		const once = rememberOrderProof(undefined, "cm_first");

		expect(once).toBe("cm_first");

		const twice = rememberOrderProof(once, "cm_second");

		expect(twice).toBe("cm_second|cm_first");
		expect(rememberOrderProof(twice, "cm_first")).toBe("cm_first|cm_second");
	});

	it("reads back the ids it wrote and drops anything that is not one", () => {
		expect(parseOrderProofs("cm_a|cm_b")).toEqual(["cm_a", "cm_b"]);
		expect(parseOrderProofs("|cm_a||   |")).toEqual(["cm_a"]);
		expect(parseOrderProofs(undefined)).toEqual([]);
		expect(parseOrderProofs("")).toEqual([]);
	});

	it("forgets the oldest ids past the limit", () => {
		const full = Array.from(
			{ length: ORDER_PROOF_LIMIT },
			(_, index) => `cm_order_${index}`,
		).reduce<string>((raw, id) => rememberOrderProof(raw, id), "");

		expect(parseOrderProofs(full)).toHaveLength(ORDER_PROOF_LIMIT);

		const overflowed = parseOrderProofs(rememberOrderProof(full, "cm_newest"));

		expect(overflowed).toHaveLength(ORDER_PROOF_LIMIT);
		expect(overflowed[0]).toBe("cm_newest");
		expect(overflowed).not.toContain("cm_order_0");
	});

	it("answers whether one order is proven without trusting anything else", () => {
		expect(hasOrderProof(["cm_a", "cm_b"], "cm_b")).toBe(true);
		expect(hasOrderProof(["cm_a", "cm_b"], "cm_c")).toBe(false);
		expect(hasOrderProof([], "cm_a")).toBe(false);
	});

	it("is httpOnly, lax and scoped to the whole site", () => {
		expect(ORDER_PROOF_COOKIE).toBe("itech-store.pedidos.v1");
		expect(orderProofCookieOptions()).toMatchObject({
			httpOnly: true,
			sameSite: "lax",
			path: "/",
		});
	});
});
