import { prisma } from "@/lib/prisma";

import { MAX_LINE_QUANTITY, type CartLine } from "../domain/cart";
import { mergeGuestCart } from "../domain/merge-guest-cart";
import {
	CATALOGUE_VARIANT_SELECT,
	toCatalogueVariant,
	type CatalogueVariantRow,
} from "./catalogue-variant";

export type ServerCart = {
	lines: CartLine[];
	cappedVariantIds: string[];
};

type CartItemRow = {
	id: string;
	variantId: string;
	quantity: number;
	variant: CatalogueVariantRow;
};

const CART_ITEM_SELECT = {
	id: true,
	variantId: true,
	quantity: true,
	variant: { select: CATALOGUE_VARIANT_SELECT },
} as const;

export function toCartLine(row: CartItemRow): CartLine {
	const variant = toCatalogueVariant(row.variant);

	return {
		variantId: variant.variantId,
		sku: variant.sku,
		productSlug: variant.productSlug,
		productName: variant.productName,
		familyLabel: variant.familyLabel,
		variantLabel: variant.variantLabel,
		imageUrl: variant.imageUrl,
		imageAlt: variant.imageAlt,
		unitPriceCents: variant.unitPriceCents,
		quantity: row.quantity,
		available: row.variant.stock > 0,
	};
}

function capOf(stock: number): number {
	return Math.min(MAX_LINE_QUANTITY, Math.max(stock, 1));
}

export async function readServerCart(userId: string): Promise<ServerCart> {
	const rows = (await prisma.cartItem.findMany({
		where: { userId },
		select: CART_ITEM_SELECT,
	})) as CartItemRow[];

	return {
		lines: rows.map(toCartLine),
		cappedVariantIds: rows
			.filter((row) => row.quantity >= capOf(row.variant.stock))
			.map((row) => row.variantId),
	};
}

export async function writeCartLines(userId: string, lines: CartLine[]): Promise<void> {
	const wanted = new Map(lines.map((line) => [line.variantId, line.quantity]));
	const rows = (await prisma.cartItem.findMany({
		where: { userId },
		select: { id: true, variantId: true, quantity: true },
	})) as { id: string; variantId: string; quantity: number }[];

	for (const row of rows) {
		const quantity = wanted.get(row.variantId);

		if (quantity === undefined) {
			await prisma.cartItem.delete({ where: { id: row.id } });
		} else if (quantity !== row.quantity) {
			await prisma.cartItem.update({ where: { id: row.id }, data: { quantity } });
		}

		wanted.delete(row.variantId);
	}

	for (const [variantId, quantity] of wanted) {
		await prisma.cartItem.create({ data: { userId, variantId, quantity } });
	}
}

export async function mergeGuestCartForUser(
	userId: string,
	guestLines: CartLine[],
): Promise<void> {
	const rows = (await prisma.cartItem.findMany({
		where: { userId },
		select: CART_ITEM_SELECT,
	})) as CartItemRow[];
	const guestVariantIds = [...new Set(guestLines.map((line) => line.variantId))];
	const variants = await prisma.variant.findMany({
		where: { id: { in: guestVariantIds } },
		select: { id: true, stock: true },
	});

	const stock = new Map<string, number>(variants.map((v) => [v.id, v.stock]));

	for (const row of rows) {
		if (!stock.has(row.variantId)) {
			stock.set(row.variantId, row.variant.stock);
		}
	}

	const merged = mergeGuestCart(
		rows.map(toCartLine),
		guestLines,
		stock,
	);

	await writeCartLines(userId, merged.lines);
}
