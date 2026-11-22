import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AdminDestinationId } from "../domain/navigation";
import { AdminNav } from "./admin-nav";
import { AdminShell } from "./admin-shell";

const mark = (current: AdminDestinationId | null) =>
	renderToStaticMarkup(
		<AdminShell
			nav={
				<AdminNav
					current={current}
					pendingOrders={2}
					productCount={14}
				/>
			}
		>
			<p>El contenido del panel.</p>
		</AdminShell>,
	);

describe("the admin shell", () => {
	it("marks the destination the pathname resolved to, and only that one", () => {
		const markup = mark("pedidos");
		const marked = markup.match(/<a[^>]*aria-current="page"[^>]*>[\s\S]*?<\/a>/g) ?? [];

		expect(marked).toHaveLength(1);
		expect(marked[0]).toContain('href="/admin/pedidos"');
		expect(marked[0]).toContain("Pedidos");
	});

	it.each([
		["panel", "/admin"],
		["productos", "/admin/productos"],
		["pedidos", "/admin/pedidos"],
		["ajustes", "/admin/ajustes"],
	] as const)("moves the mark to %s", (destination, href) => {
		const marked =
			mark(destination).match(/<a[^>]*aria-current="page"[^>]*>/g) ?? [];

		expect(marked).toHaveLength(1);
		expect(marked[0]).toContain(`href="${href}"`);
	});

	it("leaves every destination unmarked when no pathname matched", () => {
		expect(mark(null)).not.toContain('aria-current="page"');
	});

	it("keeps one skip link straight to the content", () => {
		const markup = mark("panel");

		expect(markup).toContain('class="skip" href="#admin-main"');
		expect(markup).toContain('id="admin-main"');
	});

	it("counts the orders waiting and says what the number means", () => {
		const markup = mark("panel");

		expect(markup).toContain("2 pedidos a preparar");
	});

	it("offers the search control as a button with its keyboard hint", () => {
		const markup = mark("panel");

		expect(markup).toContain("Buscar en el panel");
		expect(markup).toContain("⌘K");
		expect(markup).toContain('aria-keyshortcuts="Meta+K Control+K"');
		expect(markup).not.toContain("<input");
	});

	it("keeps the products sub-navigation inline and the person at the foot", () => {
		const markup = mark("panel");

		expect(markup).toContain('href="/admin/productos/nuevo"');
		expect(markup).toContain("sofia.ramos@example.com");
		expect(markup).toContain("Cerrar sesión");
		expect(markup).toContain('href="/catalogo"');
	});

	it("says there is one workspace instead of faking a switcher", () => {
		expect(mark("panel")).toContain("Esta demo tiene un solo espacio de trabajo.");
	});
});
