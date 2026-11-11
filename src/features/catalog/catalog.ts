import type { Category } from "@/generated/prisma/enums";

/** Shown when a product has no image at all (fresh clone, S13). */
export const PLACEHOLDER_IMAGE = "/placeholder.webp";

/**
 * The hanging order of the families on the landing. It is explicit so that the
 * database never decides the composition: `IPHONE` sits last and has no products
 * in the seeded catalog, which the page states instead of hiding.
 */
export const FAMILY_ORDER = [
	"MAC",
	"IPAD",
	"WATCH",
	"AIRPODS",
	"ACCESSORY",
	"IPHONE",
] as const satisfies readonly Category[];

export const FAMILY_LABEL: Record<Category, string> = {
	MAC: "Mac",
	IPAD: "iPad",
	WATCH: "Watch",
	AIRPODS: "AirPods",
	ACCESSORY: "Accesorios",
	IPHONE: "iPhone",
};

/** Families the header and the footer link to: the ones the catalog sells today. */
export const NAV_FAMILIES = FAMILY_ORDER.filter(
	(category) => category !== "IPHONE",
);

/** What a card renders. Money stays in integer cents until `formatArsPrice`. */
export type CatalogCard = {
	slug: string;
	name: string;
	category: Category;
	/** The first image path, or null when the product carries none. */
	image: string | null;
	/** Lowest price across the product's variants, in integer ARS cents. */
	priceFrom: number | null;
};
