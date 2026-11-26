"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
	RECEIPT_ORDER_SELECT,
	toReceiptOrder,
	type ReceiptOrderRow,
} from "@/features/checkout/server/order-receipt";
import type { Order } from "@/features/checkout/domain/order";

const EMAIL_SCHEMA = z.email();

export const INVALID_EMAIL_COPY = "Ese email no parece válido.";
export const MAGIC_LINK_SENT_COPY =
	"Si el correo es correcto, te mandamos un enlace para entrar. Revisalo en unos minutos.";
export const MAGIC_LINK_FAILED_COPY =
	"No pudimos enviar el correo en este momento. Volvé a intentar en un rato.";

export type MagicLinkState = {
	error: string | null;
	message: string | null;
	fieldError: string | null;
};

export async function requestMagicLink(
	_state: MagicLinkState,
	formData: FormData,
): Promise<MagicLinkState> {
	const value = formData.get("email");
	const parsed = EMAIL_SCHEMA.safeParse(typeof value === "string" ? value.trim() : "");

	if (!parsed.success) {
		return { error: null, message: null, fieldError: INVALID_EMAIL_COPY };
	}

	try {
		await getAuth().api.signInMagicLink({
			body: { email: parsed.data, callbackURL: "/mis-pedidos" },
			headers: await headers(),
		});
	} catch {
		return { error: MAGIC_LINK_FAILED_COPY, message: null, fieldError: null };
	}

	return { error: null, message: MAGIC_LINK_SENT_COPY, fieldError: null };
}

export type MyOrdersResult = { ok: true; orders: Order[] } | { ok: false };

const MY_ORDERS_SELECT = RECEIPT_ORDER_SELECT;

export async function listMyOrders(): Promise<MyOrdersResult> {
	let userId: string | null = null;
	let email: string | null = null;

	try {
		const current = await getAuth().api.getSession({ headers: await headers() });

		if (current === null || current.user.email === null) {
			return { ok: false };
		}

		userId = current.user.id;
		email = current.user.email;
	} catch {
		return { ok: false };
	}

	try {
		const rows = (await prisma.order.findMany({
			where: {
				OR: [{ userId }, { buyerEmail: email }],
			},
			orderBy: { createdAt: "desc" },
			select: MY_ORDERS_SELECT,
		})) as ReceiptOrderRow[];

		return { ok: true, orders: rows.map(toReceiptOrder) };
	} catch {
		return { ok: false };
	}
}
