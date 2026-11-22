import { PLACEHOLDER_IMAGE } from "@/features/catalog/domain/catalog";
import { describe, expect, it } from "vitest";

import { ADMIN_PRODUCTS } from "../fixtures/products";
import {
	ADMIN_CHANNELS,
	SHIPPING_FACTS,
	SHIPPING_RULE,
	channelStates,
	mediaLibrary,
	mediaSummary,
	mediaUsageLabel,
	unpublishedChannelCount,
	unpublishedChannelLabel,
} from "./settings";

describe("the store channels", () => {
	it("publishes neither of the two channels the owner has not confirmed", () => {
		expect(ADMIN_CHANNELS.map((channel) => channel.published)).toEqual([
			false,
			false,
		]);
		expect(ADMIN_CHANNELS.map((channel) => channel.value)).toEqual([null, null]);
		expect(ADMIN_CHANNELS.map((channel) => channel.href)).toEqual([null, null]);
	});

	it("says how many channels are still unpublished", () => {
		expect(unpublishedChannelCount(ADMIN_CHANNELS)).toBe(2);
		expect(unpublishedChannelLabel(2)).toBe("2 sin publicar");
		expect(unpublishedChannelLabel(1)).toBe("1 sin publicar");
		expect(unpublishedChannelLabel(0)).toBe("Dos canales publicados");
	});

	it("publishes a channel the moment its value exists, with no other change", () => {
		const published = channelStates(
			{ href: "https://wa.me/5491123456789", label: "5491123456789" },
			{ href: "mailto:ventas@dominio.com", label: "ventas@dominio.com" },
		);

		expect(published.map((channel) => channel.published)).toEqual([true, true]);
		expect(published.map((channel) => channel.value)).toEqual([
			"5491123456789",
			"ventas@dominio.com",
		]);
		expect(published.map((channel) => channel.href)).toEqual([
			"https://wa.me/5491123456789",
			"mailto:ventas@dominio.com",
		]);
	});
});

describe("the shipping rule", () => {
	it("quotes the store's only rule, word for word", () => {
		expect(SHIPPING_RULE).toBe("El envío se coordina al finalizar");
	});

	it("states that no cost is computed, so nothing can look like a tariff", () => {
		expect(SHIPPING_FACTS).toEqual([
			{ term: "Costo calculado", detail: "No" },
			{ term: "Zonas y tarifas", detail: "Sin definir" },
			{ term: "El total del pedido", detail: "Suma los productos" },
		]);
	});
});

describe("the media library", () => {
	it("lists the catalogue photographs once each, with the product that uses it", () => {
		const library = mediaLibrary(ADMIN_PRODUCTS);

		expect(library.images).toHaveLength(14);
		expect(library.images[0]).toEqual({
			src: "/products/airpods/airpods-pro-3-1.webp",
			name: "Airpods Pro 3",
			products: 1,
		});
		expect(library.summary).toBe("14 imágenes · 1 de reserva");
	});

	it("counts a photograph used by two products once and marks the shared usage", () => {
		const shared = [
			{ ...ADMIN_PRODUCTS[0], slug: "copia-a", name: "Copia A" },
			{ ...ADMIN_PRODUCTS[0], slug: "copia-b", name: "Copia B" },
		];
		const library = mediaLibrary(shared);

		expect(library.images).toHaveLength(1);
		expect(library.images[0].products).toBe(2);
		expect(library.images[0].name).toBe("Copia A");
	});

	it("counts the products without a photograph on the reserve image", () => {
		const library = mediaLibrary([
			...ADMIN_PRODUCTS,
			{ ...ADMIN_PRODUCTS[0], slug: "sin-foto", image: null },
		]);

		expect(library.reserve).toEqual({ src: PLACEHOLDER_IMAGE, products: 1 });
		expect(library.summary).toBe("14 imágenes · 1 de reserva");
	});

	it("writes the usage of a tile with its number and its role", () => {
		expect(mediaUsageLabel(1, "portada")).toBe("1 producto · portada");
		expect(mediaUsageLabel(3, "portada")).toBe("3 productos · portada");
		expect(mediaUsageLabel(0, "reserva")).toBe("0 productos · reserva");
	});

	it("does not count the reserve image as a catalogue photograph", () => {
		expect(mediaSummary(0)).toBe("Sin imágenes · 1 de reserva");
		expect(mediaSummary(1)).toBe("1 imagen · 1 de reserva");
		expect(mediaSummary(14)).toBe("14 imágenes · 1 de reserva");
	});
});
