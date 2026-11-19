"use server";

import { FAMILY_LABEL, formatStorage, variantLabel } from "@/features/catalog/catalog";
import { prisma } from "@/lib/prisma";

import type { CatalogVariant, RevalidationResult } from "./cart-revalidation";

/** The cart's own bound: more than this is not a cart, and the call is bounded. */
const MAX_VARIANTS = 50;
const MAX_ID_LENGTH = 64;

/**
 * Revalidates the stored cart against the catalogue (§S9).
 *
 * Everything the panel shows about a line — name, variant, photograph, price,
 * stock — is read back from the database here, because the stored snapshot can
 * be arbitrarily old and the total is money. Ids come from the browser, so they
 * are deduplicated, bounded and validated before they reach the query.
 *
 * A database failure answers `{ ok: false }` instead of throwing: the panel then
 * says the prices could not be verified, which is honest, where an exception
 * would leave the drawer on a blank total.
 */
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
			select: {
				id: true,
				sku: true,
				storage: true,
				color: true,
				price: true,
				stock: true,
				product: {
					select: { slug: true, name: true, category: true, images: true },
				},
			},
			where: { id: { in: ids } },
		});

		const variants: CatalogVariant[] = rows.map((row) => ({
			variantId: row.id,
			sku: row.sku,
			productSlug: row.product.slug,
			productName: row.product.name,
			familyLabel: FAMILY_LABEL[row.product.category],
			variantLabel: formatStorage(row.storage),
			imageUrl: row.product.images[0] ?? null,
			imageAlt: `${row.product.name}, ${variantLabel(row.storage, row.color)}`,
			unitPriceCents: row.price,
			stock: row.stock,
		}));

		return { ok: true, variants, requested: ids };
	} catch {
		return { ok: false };
	}
}
