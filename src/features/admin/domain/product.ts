import type { Category } from "@/generated/prisma/enums";

export const LOW_STOCK_THRESHOLD = 2;

export type AdminVariant = {
	sku: string;
	label: string | null;
	priceCents: number;
	stock: number;
};

export type AdminProductImage = {
	position: number;
	url: string;
	alt: string;
};

export type AdminProduct = {
	slug: string;
	name: string;
	description: string | null;
	category: Category;
	gallery: readonly AdminProductImage[];
	published: boolean;
	destacado: boolean;
	createdAt: string;
	variants: AdminVariant[];
};

export type AdminVariantInput = {
	label: string | null;
	priceCents: number;
	stock: number;
};

export type CreateProductInput = {
	name: string;
	description: string | null;
	category: Category;
	gallery?: readonly AdminProductImage[];
	published: boolean;
	destacado: boolean;
	createdAt: string;
	variants: readonly AdminVariantInput[];
};

export type AdminProductPatch = {
	name?: string;
	description?: string | null;
	category?: Category;
	gallery?: readonly AdminProductImage[];
	published?: boolean;
	destacado?: boolean;
	variants?: readonly AdminVariant[];
};

const COMBINING_MARKS = /[\u0300-\u036f]/g;
const NOT_SLUG = /[^a-z0-9]+/g;
const NOT_SKU = /[^a-z0-9]+/g;
const EDGES = /^-+|-+$/g;
const THOUSANDS = /^\d{1,3}(?:\.\d{3})+$/;
const PLAIN_PESOS = /^\d+$/;
const DECIMAL_PESOS = /^(\d{1,3}(?:\.\d{3})+|\d+),(\d{1,2})$/;
const CURRENCY_NOISE = /[\s$\u00a0\u202f]/g;

const DATE_FORMAT = new Intl.DateTimeFormat("es-AR", {
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

const PESOS_FORMAT = new Intl.NumberFormat("es-AR", {
	maximumFractionDigits: 0,
});

export function orderedGallery(
	images: readonly AdminProductImage[],
): AdminProductImage[] {
	return images
		.map((image) => ({ ...image }))
		.sort((first, second) => first.position - second.position);
}

export function productCoverImage(product: AdminProduct): AdminProductImage | null {
	const [cover] = orderedGallery(product.gallery);

	return cover ?? null;
}

export function lowestStockVariant(product: AdminProduct): AdminVariant | null {
	return product.variants.reduce<AdminVariant | null>((scarcest, variant) => {
		if (scarcest === null || variant.stock < scarcest.stock) {
			return variant;
		}

		return scarcest;
	}, null);
}

export function productPriceFrom(product: AdminProduct): number | null {
	if (product.variants.length === 0) {
		return null;
	}

	return Math.min(...product.variants.map((variant) => variant.priceCents));
}

export function productStockTotal(product: AdminProduct): number {
	return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export function isLowOnStock(
	product: AdminProduct,
	threshold: number = LOW_STOCK_THRESHOLD,
): boolean {
	const scarcest = lowestStockVariant(product);

	return scarcest !== null && scarcest.stock <= threshold;
}

export function productSlug(name: string): string {
	return name
		.normalize("NFD")
		.replace(COMBINING_MARKS, "")
		.toLowerCase()
		.replace(NOT_SLUG, "-")
		.replace(EDGES, "");
}

export function variantSku(slug: string, label: string | null): string {
	const capacity = label === null ? "" : label.toLowerCase().replace(NOT_SKU, "");

	return capacity === "" ? slug : `${slug}-${capacity}`;
}

export function parsePricePesos(value: string): number | null {
	const cleaned = value.replace(CURRENCY_NOISE, "");

	if (cleaned === "") {
		return null;
	}

	const decimal = DECIMAL_PESOS.exec(cleaned);

	if (decimal !== null) {
		const pesos = Number(decimal[1]?.replace(/\./g, ""));
		const cents = Number(decimal[2]?.padEnd(2, "0"));

		return pesos * 100 + cents;
	}

	if (THOUSANDS.test(cleaned) || PLAIN_PESOS.test(cleaned)) {
		return Number(cleaned.replace(/\./g, "")) * 100;
	}

	return null;
}

export function pesosInputValue(cents: number): string {
	const pesos = Math.trunc(cents / 100);
	const remainder = cents % 100;
	const whole = PESOS_FORMAT.format(pesos).replace(/[\u00a0\u202f]/g, " ");

	return remainder === 0 ? whole : `${whole},${String(remainder).padStart(2, "0")}`;
}

export function productDateLabel(iso: string): string {
	return DATE_FORMAT.format(new Date(iso));
}

function wholeUnits(value: number): boolean {
	return Number.isInteger(value) && value >= 0;
}

function normaliseDescription(description: string | null): string | null {
	const trimmed = description === null ? "" : description.trim();

	return trimmed === "" ? null : trimmed;
}

function normaliseLabel(label: string | null): string | null {
	const trimmed = label === null ? "" : label.trim();

	return trimmed === "" ? null : trimmed;
}

export function createProduct(input: CreateProductInput): AdminProduct {
	const name = input.name.trim();

	if (name === "") {
		throw new Error("El producto necesita un nombre.");
	}

	const slug = productSlug(name);

	if (slug === "") {
		throw new Error("El nombre del producto no produce un slug.");
	}

	if (Number.isNaN(Date.parse(input.createdAt))) {
		throw new Error("La fecha de creación tiene que ser una fecha.");
	}

	if (input.variants.length === 0) {
		throw new Error("El producto necesita al menos una variante.");
	}

	const variants = input.variants.map((variant) => {
		if (!wholeUnits(variant.priceCents) || !wholeUnits(variant.stock)) {
			throw new Error("Cada variante necesita un precio y un stock en enteros.");
		}

		const label = normaliseLabel(variant.label);

		return {
			sku: variantSku(slug, label),
			label,
			priceCents: variant.priceCents,
			stock: variant.stock,
		};
	});

	return {
		slug,
		name,
		description: normaliseDescription(input.description),
		category: input.category,
		gallery: orderedGallery(input.gallery ?? []),
		published: input.published,
		destacado: input.destacado,
		createdAt: input.createdAt,
		variants,
	};
}

export function updateProduct(
	products: readonly AdminProduct[],
	slug: string,
	patch: AdminProductPatch,
): readonly AdminProduct[] {
	if (!products.some((product) => product.slug === slug)) {
		return products;
	}

	return products.map((product) => {
		if (product.slug !== slug) {
			return product;
		}

		return {
			...product,
			...patch,
			name: patch.name === undefined ? product.name : patch.name.trim(),
			description:
				patch.description === undefined
					? product.description
					: normaliseDescription(patch.description),
			gallery:
				patch.gallery === undefined
					? product.gallery
					: orderedGallery(patch.gallery),
			variants:
				patch.variants === undefined
					? product.variants
					: patch.variants.map((variant) => ({ ...variant })),
		};
	});
}

export function setPublished(
	products: readonly AdminProduct[],
	slug: string,
	published: boolean,
): readonly AdminProduct[] {
	return updateProduct(products, slug, { published });
}

export function deleteProduct(
	products: readonly AdminProduct[],
	slug: string,
): readonly AdminProduct[] {
	const kept = products.filter((product) => product.slug !== slug);

	return kept.length === products.length ? products : kept;
}
