import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PLACEHOLDER_IMAGE } from "@/features/catalog/domain/catalog";

import { ADMIN_PRODUCTS } from "../fixtures/products";
import { SHIPPING_RULE } from "../domain/settings";
import { SettingsScreen } from "./settings-screen";

const markup = renderToStaticMarkup(
	<SettingsScreen products={ADMIN_PRODUCTS} />,
);

describe("the settings screen", () => {
	it("shows both channels as unpublished, with their word", () => {
		expect(markup.match(/Sin publicar/g) ?? []).toHaveLength(2);
		expect(markup).toContain("WhatsApp");
		expect(markup).toContain("Correo");
	});

	it("invents neither a number nor a mailbox", () => {
		expect(markup).not.toContain("wa.me");
		expect(markup).not.toContain("mailto:");
		expect(markup).not.toMatch(/\+\d{2}[\s\d]{6,}/);
		expect(markup).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
	});

	it("explains the one change that turns each channel on, twice", () => {
		expect(markup.match(/Ver cómo se activa/g) ?? []).toHaveLength(2);
		expect(markup).toContain(
			"Confirmá el número con el que vas a atender los pedidos.",
		);
		expect(markup).toContain(
			"Confirmá la casilla desde la que vas a responder los pedidos.",
		);
	});

	it("quotes the shipping rule and says no cost is computed", () => {
		expect(markup).toContain(SHIPPING_RULE);
		expect(markup).toContain("Costo calculado");
		expect(markup).toContain("Sin definir");
		expect(markup).toContain("Suma los productos");
	});

	it("shows the catalogue photographs with their usage and the reserve tile", () => {
		expect(markup.match(/src="\/products\//g) ?? []).toHaveLength(14);
		expect(markup).toContain(`src="${PLACEHOLDER_IMAGE}"`);
		expect(markup).toContain("14 imágenes · 1 de reserva");
		expect(markup).toContain("1 producto · portada");
		expect(markup).toContain("0 productos · reserva");
	});

	it("offers the upload as plainly unavailable instead of a control that lies", () => {
		expect(markup.match(/<button/g) ?? []).toHaveLength(1);
		expect(markup).toContain("No disponible en esta demo");
		expect(markup).toMatch(/<button[^>]*disabled/);
	});

	it("has nothing that could look like it saves a change", () => {
		expect(markup).not.toContain("<form");
		expect(markup).not.toContain("<input");
		expect(markup).not.toContain("<textarea");
		expect(markup).not.toContain("<select");
	});

	it("says where the data it shows comes from", () => {
		expect(markup).not.toContain("Los datos de este panel son de ejemplo");
		expect(markup).toContain("Las fotos salen del catálogo");
	});
});
