import { describe, expect, it } from "vitest";

import { forbiddenMessage } from "./copy";
import { authorizeProductImageDelete } from "./ownership";
import { guardDelete } from "./policy";

const target = { id: "product-1", name: "iPhone 15" };
const other = { id: "product-2", name: "MacBook Air" };
const KEY = "products/product-2/photo";

describe("authorizeProductImageDelete", () => {
	it("allows when the product being edited lists the image", () => {
		expect(authorizeProductImageDelete({ target, listedBy: target })).toEqual({ allowed: true });
	});

	it("allows a key no product lists, so an orphan can be cleaned up", () => {
		expect(authorizeProductImageDelete({ target, listedBy: null })).toEqual({ allowed: true });
	});

	it("denies an image another product lists", () => {
		expect(authorizeProductImageDelete({ target, listedBy: other })).toEqual({
			allowed: false,
			reason: "OTHER_PRODUCT",
			message: "No tienes permiso para eliminar esta imagen: pertenece al producto «MacBook Air».",
		});
	});

	it("compares products by identity, not by name", () => {
		const namesake = { id: "product-3", name: "iPhone 15" };

		expect(authorizeProductImageDelete({ target, listedBy: namesake })).toEqual({
			allowed: false,
			reason: "OTHER_PRODUCT",
			message: "No tienes permiso para eliminar esta imagen: pertenece al producto «iPhone 15».",
		});
	});

	it("refuses with a reason code, and the copy names the product", () => {
		const decision = authorizeProductImageDelete({ target, listedBy: other });

		expect(decision.allowed).toBe(false);
		expect(decision.allowed === false && decision.reason).toBe("OTHER_PRODUCT");
		expect(decision.allowed === false && decision.message).toContain(other.name);
	});
});

describe("forbiddenMessage", () => {
	it("forms the sentence from the product it is given", () => {
		expect(forbiddenMessage("OTHER_PRODUCT", target)).toBe(
			"No tienes permiso para eliminar esta imagen: pertenece al producto «iPhone 15».",
		);
	});
});

describe("the guard chain on the delete path", () => {
	it("passes the refusal, with its code and its copy, to the transport", async () => {
		await expect(
			guardDelete({
				session: { user: { id: "admin-1", role: "ADMIN" } },
				key: KEY,
				authorizeDelete: () => authorizeProductImageDelete({ target, listedBy: other }),
			}),
		).resolves.toEqual({
			ok: false,
			code: "FORBIDDEN",
			reason: "OTHER_PRODUCT",
			message:
				"No tienes permiso para eliminar esta imagen: pertenece al producto «MacBook Air».",
		});
	});

	it("passes an authorised delete through", async () => {
		await expect(
			guardDelete({
				session: { user: { id: "admin-1", role: "ADMIN" } },
				key: "products/product-1/photo",
				authorizeDelete: () => authorizeProductImageDelete({ target, listedBy: target }),
			}),
		).resolves.toEqual({ ok: true, actor: { id: "admin-1", role: "ADMIN" } });
	});
});
