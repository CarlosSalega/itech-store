"use server";

import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { MAX_LINE_QUANTITY, type CartLine } from "../domain/cart";
import { mergeGuestCart } from "../domain/merge-guest-cart";
import {
	CATALOGUE_VARIANT_SELECT,
	toCatalogueVariant,
} from "./catalogue-variant";
import {
	readServerCart,
	toCartLine,
	writeCartLines,
	type ServerCart,
} from "./cart-items";
import type { CatalogVariant, RevalidationResult } from "./revalidation";

const MAX_VARIANTS = 50;
const MAX_ID_LENGTH = 64;

export async function revalidateCart(variantIds: string[]): Promise<RevalidationResult> {
	if (!Array.isArray(variantIds)) {
		return { ok: false };
	}

	const ids = [
		...new Set(
			variantIds.filter(
				(id): id is string =>
					typeof id === "string" && id.length > 0 && id.length <= MAX_ID_LENGTH,
			),
		),
	].slice(0, MAX_VARIANTS);

	if (ids.length === 0) {
		return { ok: true, variants: [], requested: [] };
	}

	try {
		const rows = await prisma.variant.findMany({
			select: CATALOGUE_VARIANT_SELECT,
			where: { id: { in: ids } },
		});

		const variants: CatalogVariant[] = rows.map(toCatalogueVariant);

		return { ok: true, variants, requested: ids };
	} catch {
		return { ok: false };
	}
}

export type ServerCartResult = ({ ok: true } & ServerCart) | { ok: false };

async function requireUserId(): Promise<string | null> {
	const session = await getAuth().api.getSession({ headers: await headers() });

	return session?.user.id ?? null;
}

async function serverCartResult(userId: string): Promise<ServerCartResult> {
	try {
		return { ok: true, ...(await readServerCart(userId)) };
	} catch {
		return { ok: false };
	}
}

export async function readCart(): Promise<ServerCartResult> {
	const userId = await requireUserId();

	if (userId === null) {
		return { ok: false };
	}

	return serverCartResult(userId);
}

export async function addCartLine(variantId: string, quantity: number): Promise<ServerCartResult> {
	const userId = await requireUserId();

	if (userId === null) {
		return { ok: false };
	}

	try {
		const variant = await prisma.variant.findUnique({
			where: { id: variantId },
			select: CATALOGUE_VARIANT_SELECT,
		});

		if (variant === null || variant.stock <= 0) {
			return { ok: false };
		}

		const rows = await prisma.cartItem.findMany({
			where: { userId },
			select: { id: true, variantId: true, quantity: true, variant: { select: CATALOGUE_VARIANT_SELECT } },
		});
		const line: CartLine = {
			...toCatalogueVariant(variant),
			quantity: 0,
			available: true,
		};
		const merged = mergeGuestCart(
			rows.map(toCartLine),
			[{ ...line, quantity }],
			new Map([[variantId, variant.stock]]),
		);

		await writeCartLines(userId, merged.lines);

		return serverCartResult(userId);
	} catch {
		return { ok: false };
	}
}

export async function updateCartLine(variantId: string, quantity: number): Promise<ServerCartResult> {
	const userId = await requireUserId();

	if (userId === null) {
		return { ok: false };
	}

	try {
		const rows = await prisma.cartItem.findMany({
			where: { userId },
			select: { id: true, variantId: true, quantity: true, variant: { select: CATALOGUE_VARIANT_SELECT } },
		});

		if (!rows.some((row) => row.variantId === variantId)) {
			return serverCartResult(userId);
		}

		const variant = await prisma.variant.findUnique({
			where: { id: variantId },
			select: { stock: true },
		});

		if (variant === null) {
			await prisma.cartItem.deleteMany({ where: { userId, variantId } });
		} else {
			const cap = Math.min(MAX_LINE_QUANTITY, Math.max(variant.stock, 1));
			const next = Math.min(Math.max(1, Math.trunc(quantity)), cap);

			await prisma.cartItem.updateMany({ where: { userId, variantId }, data: { quantity: next } });
		}

		return serverCartResult(userId);
	} catch {
		return { ok: false };
	}
}

export async function removeCartLine(variantId: string): Promise<ServerCartResult> {
	const userId = await requireUserId();

	if (userId === null) {
		return { ok: false };
	}

	try {
		await prisma.cartItem.deleteMany({ where: { userId, variantId } });

		return serverCartResult(userId);
	} catch {
		return { ok: false };
	}
}
