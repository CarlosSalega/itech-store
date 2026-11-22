import { describe, expect, it } from "vitest";

import {
	ADMIN_DESTINATIONS,
	ADMIN_PRODUCT_LINKS,
	activeDestination,
} from "./navigation";

describe("where the shell says you are", () => {
	it.each([
		["/admin", "panel"],
		["/admin/", "panel"],
		["/admin/productos", "productos"],
		["/admin/productos/nuevo", "productos"],
		["/admin/productos/airpods-pro-3", "productos"],
		["/admin/pedidos", "pedidos"],
		["/admin/ajustes", "ajustes"],
	] as const)("marks %s as %s", (pathname, destination) => {
		expect(activeDestination(pathname)).toBe(destination);
	});

	it.each([["/login"], ["/"], ["/catalogo"], ["/administracion"]])(
		"marks nothing for %s",
		(pathname) => {
			expect(activeDestination(pathname)).toBeNull();
		},
	);
});

describe("the destinations in the card", () => {
	it("carries the four sections with their own hrefs", () => {
		expect(ADMIN_DESTINATIONS).toEqual([
			{ id: "panel", href: "/admin", label: "Panel" },
			{ id: "productos", href: "/admin/productos", label: "Productos" },
			{ id: "pedidos", href: "/admin/pedidos", label: "Pedidos" },
			{ id: "ajustes", href: "/admin/ajustes", label: "Ajustes" },
		]);
	});

	it("keeps the products sub-navigation inline", () => {
		expect(ADMIN_PRODUCT_LINKS).toEqual([
			{ href: "/admin/productos", label: "Todos" },
			{ href: "/admin/productos/nuevo", label: "Nuevo producto" },
		]);
	});
});
