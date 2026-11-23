import { describe, expect, it } from "vitest";

import { adminAccess, adminInitials } from "./session";

describe("the admin guard", () => {
	it("refuses an anonymous request and remembers where it was going", () => {
		expect(adminAccess(null, "/admin")).toEqual({
			allowed: false,
			loginHref: "/login?next=%2Fadmin",
		});
	});

	it("refuses a customer session and sends it back to the requested path", () => {
		expect(adminAccess({ role: "CUSTOMER" }, "/admin/productos")).toEqual({
			allowed: false,
			loginHref: "/login?next=%2Fadmin%2Fproductos",
		});
	});

	it("refuses a user whose role is missing", () => {
		expect(adminAccess({ role: null }, "/admin").allowed).toBe(false);
	});

	it.each(["admin", "Admin", "", "ADMIN ", "OWNER"])(
		"refuses the role %s because only the exact ADMIN role gets in",
		(role) => {
			expect(adminAccess({ role }, "/admin").allowed).toBe(false);
		},
	);

	it("lets an ADMIN session through and hands over who it is", () => {
		expect(
			adminAccess(
				{
					role: "ADMIN",
					name: "Sofía Ramos",
					email: "sofia.ramos@example.com",
				},
				"/admin/pedidos",
			),
		).toEqual({
			allowed: true,
			admin: { name: "Sofía Ramos", email: "sofia.ramos@example.com" },
		});
	});

	it("still admits on the role alone, with no invented identity", () => {
		expect(adminAccess({ role: "ADMIN" }, "/admin")).toEqual({
			allowed: true,
			admin: { name: "", email: "" },
		});
	});

	it("keeps the query string inside the next parameter", () => {
		expect(adminAccess(null, "/admin/productos?familia=MAC")).toEqual({
			allowed: false,
			loginHref: "/login?next=%2Fadmin%2Fproductos%3Ffamilia%3DMAC",
		});
	});
});

describe("the admin initials", () => {
	it("takes one letter from the first name and one from the last", () => {
		expect(adminInitials("Sofía Ramos", "sofia.ramos@example.com")).toBe("SR");
	});

	it("ignores the spacing around and between the names", () => {
		expect(adminInitials("  ana   maría  lío ", "ana@example.com")).toBe("AL");
	});

	it("uses the only word there is", () => {
		expect(adminInitials("Administrador", "admin@example.com")).toBe("A");
	});

	it("falls back to the email when the account has no name", () => {
		expect(adminInitials("", "admin@example.com")).toBe("A");
	});

	it("never leaves the avatar empty", () => {
		expect(adminInitials("   ", "  ")).toBe("?");
	});
});
