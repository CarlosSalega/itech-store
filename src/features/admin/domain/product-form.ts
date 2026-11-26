import type { Category } from "@/generated/prisma/enums";
import { messagesFromError } from "@/lib/validation/messages";

import {
	createProduct,
	parsePricePesos,
	productSlug,
	type AdminProduct,
	type AdminProductImage,
} from "./product";
import { blankAltIndex } from "./product-gallery";
import {
	PRODUCT_DRAFT_MESSAGES,
	PRODUCT_DRAFT_SCHEMA,
	VARIANT_REQUIRED_MESSAGES,
	VARIANT_REQUIRED_SCHEMA,
	VARIANT_SHAPE_MESSAGES,
	VARIANT_SHAPE_SCHEMA,
} from "./product-form-schema";

export type VariantDraft = {
	label: string;
	price: string;
	stock: string;
};

export type ProductDraft = {
	name: string;
	category: Category | "";
	description: string;
	published: boolean;
	destacado: boolean;
	gallery: readonly AdminProductImage[];
	variants: readonly VariantDraft[];
};

export type VariantDraftErrors = {
	label?: string;
	price?: string;
	stock?: string;
};

export type ProductDraftErrors = {
	name?: string;
	category?: string;
	slug?: string;
	gallery?: string;
	variants?: string;
	variantRows?: readonly (VariantDraftErrors | null)[];
};

export const EMPTY_VARIANT_DRAFT: VariantDraft = {
	label: "",
	price: "",
	stock: "",
};

const WHOLE_UNITS = /^\d+$/;

export function blankDraft(): ProductDraft {
	return {
		name: "",
		category: "",
		description: "",
		published: true,
		destacado: false,
		gallery: [],
		variants: [EMPTY_VARIANT_DRAFT],
	};
}

function variantErrors(variants: readonly VariantDraft[]): (VariantDraftErrors | null)[] {
	const firstSeen = new Map<string, number>();

	return variants.map((variant) => {
		const row: VariantDraftErrors = {};
		const label = variant.label.trim();
		const required = VARIANT_REQUIRED_SCHEMA.safeParse(variant);
		const shape = VARIANT_SHAPE_SCHEMA.safeParse({
			priceCents: parsePricePesos(variant.price),
			stock: WHOLE_UNITS.test(variant.stock.trim())
				? Number(variant.stock.trim())
				: null,
		});

		if (!required.success) {
			const messages = messagesFromError(required.error, VARIANT_REQUIRED_MESSAGES);

			if (messages.label !== undefined) row.label = messages.label;
			if (messages.price !== undefined) row.price = messages.price;
		}

		if (!shape.success) {
			const messages = messagesFromError(shape.error, VARIANT_SHAPE_MESSAGES);

			if (row.price === undefined && messages.priceCents !== undefined) {
				row.price = messages.priceCents;
			}

			if (messages.stock !== undefined) row.stock = messages.stock;
		}

		if (label !== "") {
			const key = label.toLowerCase();

			if (firstSeen.has(key)) {
				row.label = `Ya hay una variante de ${label} en este producto.`;
			} else {
				firstSeen.set(key, 0);
			}
		}

		return Object.keys(row).length === 0 ? null : row;
	});
}

export function validateProductDraft(
	draft: ProductDraft,
	existingSlugs: readonly string[],
): ProductDraftErrors {
	const result = PRODUCT_DRAFT_SCHEMA.safeParse(draft);
	const errors: ProductDraftErrors = result.success
		? {}
		: messagesFromError(result.error, PRODUCT_DRAFT_MESSAGES);
	const name = draft.name.trim();

	if (errors.name === undefined && existingSlugs.includes(productSlug(name))) {
		errors.slug = "Ya hay un producto con ese slug.";
	}

	const blankAlt = blankAltIndex(draft.gallery);

	if (blankAlt !== null) {
		errors.gallery = `Para guardar falta el texto alternativo de la foto ${blankAlt + 1}.`;
	}

	if (draft.variants.length === 0) {
		return errors;
	}

	const rows = variantErrors(draft.variants);

	if (rows.some((row) => row !== null)) {
		errors.variantRows = rows;
	}

	return errors;
}

function variantName(draft: ProductDraft, index: number): string {
	const label = draft.variants[index]?.label.trim() ?? "";

	return label === "" ? `la variante ${index + 1}` : `la variante de ${label}`;
}

export function saveNote(
	errors: ProductDraftErrors,
	draft: ProductDraft,
): string | null {
	if (errors.name !== undefined) {
		return "Para guardar falta el nombre.";
	}

	if (errors.category !== undefined) {
		return "Para guardar falta la familia.";
	}

	if (errors.slug !== undefined) {
		return "Para guardar hay que cambiar el nombre: ese slug ya está en el catálogo.";
	}

	if (errors.variants !== undefined) {
		return "Para guardar falta al menos una variante.";
	}

	const rows = errors.variantRows ?? [];

	for (let index = 0; index < rows.length; index += 1) {
		const row = rows[index];

		if (row === null || row === undefined) {
			continue;
		}

		if (row.price !== undefined) {
			return `Para guardar falta el precio de ${variantName(draft, index)}.`;
		}

		if (row.stock !== undefined) {
			return `Para guardar falta el stock de ${variantName(draft, index)}.`;
		}

		if (row.label !== undefined) {
			return `Para guardar falta revisar la capacidad de ${variantName(draft, index)}.`;
		}
	}

	return errors.gallery ?? null;
}

export function draftToProduct(draft: ProductDraft, createdAt: string): AdminProduct {
	if (draft.category === "") {
		throw new Error("El producto necesita una familia.");
	}

	return createProduct({
		name: draft.name,
		description: draft.description,
		category: draft.category,
		published: draft.published,
		destacado: draft.destacado,
		gallery: draft.gallery,
		createdAt,
		variants: draft.variants.map((variant) => {
			const priceCents = parsePricePesos(variant.price);

			if (priceCents === null) {
				throw new Error("Cada variante necesita un precio.");
			}

			return {
				label: variant.label,
				priceCents,
				stock: Number(variant.stock.trim()),
			};
		}),
	});
}
