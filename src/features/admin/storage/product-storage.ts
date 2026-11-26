import type { Category } from "@/generated/prisma/enums";

import type { AdminProduct, AdminProductImage, AdminVariant } from "../domain/product";
import { orderedGallery } from "../domain/product";
import { ADMIN_PRODUCTS } from "../fixtures/products";

export const ADMIN_PRODUCT_STORAGE_KEY = "itech-store.admin-products.v1";

const ADMIN_PRODUCT_STORAGE_VERSION = 1;

const CATEGORIES: readonly Category[] = [
	"IPHONE",
	"MAC",
	"IPAD",
	"WATCH",
	"AIRPODS",
	"ACCESSORY",
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
	return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readWholeNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isInteger(value) && value >= 0
		? value
		: null;
}

function readFlag(value: unknown): boolean | null {
	return typeof value === "boolean" ? value : null;
}

function readCategory(value: unknown): Category | null {
	return CATEGORIES.find((category) => category === value) ?? null;
}

function readDate(value: unknown): string | null {
	if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
		return null;
	}

	return value;
}

function readVariant(value: unknown): AdminVariant | null {
	if (!isRecord(value)) {
		return null;
	}

	const sku = readString(value.sku);
	const priceCents = readWholeNumber(value.priceCents);
	const stock = readWholeNumber(value.stock);

	if (value.label !== null && typeof value.label !== "string") {
		return null;
	}

	const label = value.label === null ? null : readString(value.label);

	if (sku === null || priceCents === null || stock === null) {
		return null;
	}

	return { sku, label, priceCents, stock };
}

function readVariants(value: unknown): AdminVariant[] | null {
	if (!Array.isArray(value) || value.length === 0) {
		return null;
	}

	const variants: AdminVariant[] = [];

	for (const candidate of value) {
		const variant = readVariant(candidate);

		if (variant === null) {
			return null;
		}

		variants.push(variant);
	}

	return variants;
}

function readImage(value: unknown): AdminProductImage | null {
	if (!isRecord(value)) {
		return null;
	}

	const position = readWholeNumber(value.position);
	const url = readString(value.url);
	const alt = readString(value.alt);

	if (position === null || url === null || alt === null) {
		return null;
	}

	return { position, url, alt };
}

function readGallery(value: unknown): AdminProductImage[] | null {
	if (!Array.isArray(value)) {
		return null;
	}

	const images: AdminProductImage[] = [];

	for (const candidate of value) {
		const image = readImage(candidate);

		if (image === null) {
			return null;
		}

		images.push(image);
	}

	return orderedGallery(images);
}

function parseProduct(value: unknown): AdminProduct | null {
	if (!isRecord(value)) {
		return null;
	}

	const slug = readString(value.slug);
	const name = readString(value.name);
	const category = readCategory(value.category);
	const createdAt = readDate(value.createdAt);
	const published = readFlag(value.published);
	const destacado = readFlag(value.destacado);
	const gallery = readGallery(value.gallery);
	const variants = readVariants(value.variants);

	if (
		slug === null ||
		name === null ||
		category === null ||
		createdAt === null ||
		published === null ||
		destacado === null ||
		gallery === null ||
		variants === null
	) {
		return null;
	}

	if (value.description !== null && typeof value.description !== "string") {
		return null;
	}

	return {
		slug,
		name,
		description: value.description === null ? null : value.description,
		category,
		gallery,
		published,
		destacado,
		createdAt,
		variants,
	};
}

function parseEnvelope(raw: string | null): unknown[] | null {
	if (typeof raw !== "string" || raw.trim() === "") {
		return null;
	}

	try {
		const parsed: unknown = JSON.parse(raw);

		if (!isRecord(parsed) || parsed.version !== ADMIN_PRODUCT_STORAGE_VERSION) {
			return null;
		}

		return Array.isArray(parsed.products) ? parsed.products : null;
	} catch {
		return null;
	}
}

export function parseProducts(raw: string | null): readonly AdminProduct[] {
	const candidates = parseEnvelope(raw);

	if (candidates === null) {
		return ADMIN_PRODUCTS;
	}

	const products: AdminProduct[] = [];
	const seen = new Set<string>();

	for (const candidate of candidates) {
		const product = parseProduct(candidate);

		if (product === null || seen.has(product.slug)) {
			continue;
		}

		seen.add(product.slug);
		products.push(product);
	}

	if (products.length === 0 && candidates.length > 0) {
		return ADMIN_PRODUCTS;
	}

	return products;
}

export function serializeProducts(products: readonly AdminProduct[]): string {
	return JSON.stringify({
		version: ADMIN_PRODUCT_STORAGE_VERSION,
		products,
	});
}

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

export function readStoredProducts(
	storage: ReadableStorage | null | undefined,
): readonly AdminProduct[] {
	if (storage === null || storage === undefined) {
		return ADMIN_PRODUCTS;
	}

	try {
		return parseProducts(storage.getItem(ADMIN_PRODUCT_STORAGE_KEY));
	} catch {
		return ADMIN_PRODUCTS;
	}
}

export function writeStoredProducts(
	storage: WritableStorage | null | undefined,
	products: readonly AdminProduct[],
): boolean {
	if (storage === null || storage === undefined) {
		return false;
	}

	try {
		storage.setItem(ADMIN_PRODUCT_STORAGE_KEY, serializeProducts(products));

		return true;
	} catch {
		return false;
	}
}
