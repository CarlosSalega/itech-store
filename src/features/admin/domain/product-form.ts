import type { Category } from "@/generated/prisma/enums";

import {
	createProduct,
	parsePricePesos,
	productSlug,
	type AdminProduct,
} from "./product";

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
		variants: [EMPTY_VARIANT_DRAFT],
	};
}

function variantErrors(variants: readonly VariantDraft[]): (VariantDraftErrors | null)[] {
	const firstSeen = new Map<string, number>();

	return variants.map((variant) => {
		const row: VariantDraftErrors = {};
		const label = variant.label.trim();

		if (label === "") {
			row.label = "Poné la capacidad de esta variante.";
		} else {
			const key = label.toLowerCase();

			if (firstSeen.has(key)) {
				row.label = `Ya hay una variante de ${label} en este producto.`;
			} else {
				firstSeen.set(key, 0);
			}
		}

		if (variant.price.trim() === "") {
			row.price = "Poné el precio de esta variante.";
		} else if (parsePricePesos(variant.price) === null) {
			row.price = "Ese precio no es un número.";
		}

		if (!WHOLE_UNITS.test(variant.stock.trim())) {
			row.stock = "Poné el stock en unidades enteras.";
		}

		return Object.keys(row).length === 0 ? null : row;
	});
}

export function validateProductDraft(
	draft: ProductDraft,
	existingSlugs: readonly string[],
): ProductDraftErrors {
	const errors: ProductDraftErrors = {};
	const name = draft.name.trim();

	if (name === "") {
		errors.name = "Poné el nombre del producto.";
	} else if (existingSlugs.includes(productSlug(name))) {
		errors.slug = "Ya hay un producto con ese slug.";
	}

	if (draft.category === "") {
		errors.category = "Elegí una familia.";
	}

	if (draft.variants.length === 0) {
		errors.variants = "Cargá al menos una variante.";
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

	return null;
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
