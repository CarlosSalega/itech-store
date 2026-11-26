"use server";

import { prisma } from "@/lib/prisma";

import { CATALOGUE_VARIANT_SELECT, toCatalogueVariant } from "./catalogue-variant";
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
