import { PLACEHOLDER_IMAGE } from "@/features/catalog/domain/catalog";
import {
	EMAIL_CHANNEL,
	WHATSAPP_CHANNEL,
	type ContactChannel,
} from "@/features/contact/contact-channels";

import type { AdminProduct } from "./product";

export type ChannelId = "whatsapp" | "email";

export type AdminChannel = {
	id: ChannelId;
	name: string;
	published: boolean;
	value: string | null;
	href: string | null;
	pendingLabel: string;
	copy: string;
	activation: string;
};

export const SHIPPING_RULE = "El envío se coordina al finalizar";

export const SHIPPING_FACTS: readonly { term: string; detail: string }[] = [
	{ term: "Costo calculado", detail: "No" },
	{ term: "Zonas y tarifas", detail: "Sin definir" },
	{ term: "El total del pedido", detail: "Suma los productos" },
];

export function channelStates(
	whatsapp: ContactChannel,
	email: ContactChannel,
): readonly AdminChannel[] {
	return [
		{
			id: "whatsapp",
			name: "WhatsApp",
			published: whatsapp !== null,
			value: whatsapp?.label ?? null,
			href: whatsapp?.href ?? null,
			pendingLabel: "Número a confirmar",
			copy: "La tienda no publicó un número: el botón de la tienda lleva a contacto y no abre un chat.",
			activation:
				"Confirmá el número con el que vas a atender los pedidos. Cuando esté confirmado, el canal queda publicado y el botón de la tienda abre el chat.",
		},
		{
			id: "email",
			name: "Correo",
			published: email !== null,
			value: email?.label ?? null,
			href: email?.href ?? null,
			pendingLabel: "Dirección a confirmar",
			copy: "La tienda no publicó una casilla: no se muestra ningún correo ni se promete respuesta por mail.",
			activation:
				"Confirmá la casilla desde la que vas a responder los pedidos. Cuando esté confirmada, el canal queda publicado en la página de contacto.",
		},
	];
}

export const ADMIN_CHANNELS: readonly AdminChannel[] = channelStates(
	WHATSAPP_CHANNEL,
	EMAIL_CHANNEL,
);

export function unpublishedChannelCount(
	channels: readonly AdminChannel[],
): number {
	return channels.filter((channel) => !channel.published).length;
}

export function unpublishedChannelLabel(count: number): string {
	if (count === 0) {
		return "Dos canales publicados";
	}

	return count === 1 ? "1 sin publicar" : `${count} sin publicar`;
}

export type MediaImage = {
	src: string;
	name: string;
	products: number;
};

export type MediaLibrary = {
	images: readonly MediaImage[];
	reserve: { src: string; products: number };
	summary: string;
};

function pluralProducts(count: number): string {
	return count === 1 ? "1 producto" : `${count} productos`;
}

export function mediaUsageLabel(
	products: number,
	role: "portada" | "reserva",
): string {
	return `${pluralProducts(products)} · ${role}`;
}

export function mediaSummary(images: number): string {
	const label =
		images === 0 ? "Sin imágenes" : images === 1 ? "1 imagen" : `${images} imágenes`;

	return `${label} · 1 de reserva`;
}

export function mediaLibrary(products: readonly AdminProduct[]): MediaLibrary {
	const grouped = new Map<string, AdminProduct[]>();
	let reserveProducts = 0;

	for (const product of products) {
		if (product.image === null) {
			reserveProducts += 1;
			continue;
		}

		const group = grouped.get(product.image);

		if (group === undefined) {
			grouped.set(product.image, [product]);
		} else {
			group.push(product);
		}
	}

	const images = [...grouped].map(([src, group]) => ({
		src,
		name: group[0].name,
		products: group.length,
	}));

	return {
		images,
		reserve: { src: PLACEHOLDER_IMAGE, products: reserveProducts },
		summary: mediaSummary(images.length),
	};
}
