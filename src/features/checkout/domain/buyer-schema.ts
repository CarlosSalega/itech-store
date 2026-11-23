import { z } from "zod";

import type { BuyerField } from "./order";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const BUYER_REQUIRED_SCHEMA = z.object({
	name: z.string().trim().min(1),
	email: z.string().trim().min(1),
	phone: z.string().trim().min(1),
	address: z.string().trim().min(1),
	city: z.string().trim().min(1),
	postalCode: z.string().trim().min(1),
});

export const BUYER_REQUIRED_MESSAGES: Record<BuyerField, string> = {
	name: "Escribí tu nombre y apellido.",
	email: "Escribí tu email.",
	phone: "Escribí un teléfono.",
	address: "Escribí la dirección de entrega.",
	city: "Escribí la ciudad.",
	postalCode: "Falta el código postal.",
};

export const BUYER_EMAIL_SCHEMA = z.object({
	email: z.string().trim().regex(EMAIL_PATTERN),
});

export const BUYER_EMAIL_MESSAGES: Record<"email", string> = {
	email: "Ese email no parece válido.",
};
