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

/**
 * The `?familia=` slug of each family: the enum in lowercase, spelled out so the
 * URL shape is reviewed here instead of following the enum by accident.
 */
export const FAMILY_SLUG = {
	MAC: "mac",
	IPAD: "ipad",
	WATCH: "watch",
	AIRPODS: "airpods",
	ACCESSORY: "accessory",
	IPHONE: "iphone",
} as const satisfies Record<Category, string>;

/**
 * Reads the `?familia=` parameter.
 *
 * An unknown, empty or repeated value maps to `null`, which means "no filter":
 * a bad query string renders the whole catalog rather than a 404. The parameter
 * is normalised first, so `?familia=Mac` still filters instead of being treated
 * as unknown.
 */
export function familyFromSlug(
	value: string | string[] | undefined,
): Category | null {
	if (typeof value !== "string") return null;

	const slug = value.trim().toLowerCase();
	if (slug === "") return null;

	return (
		FAMILY_ORDER.find((category) => FAMILY_SLUG[category] === slug) ?? null
	);
}

/**
 * Builds a catalog URL. Page 1 omits the parameter (it is the default), while a
 * link to `?page=1` still works because `paginatePage` clamps it to page 1.
 */
export function catalogHref({
	family = null,
	page = 1,
}: {
	family?: Category | null;
	page?: number;
} = {}): string {
	const params = new URLSearchParams();
	if (family !== null) params.set("familia", FAMILY_SLUG[family]);
	if (page > 1) params.set("page", String(page));

	const query = params.toString();
	return query === "" ? "/catalogo" : `/catalogo?${query}`;
}

/**
 * Formats a stored capacity (`128GB`) for the UI (`128 GB`). Returns `null` when
 * the variant carries none, because not every product is sold by capacity.
 */
export function formatStorage(storage: string | null): string | null {
	if (storage === null) return null;

	const value = storage.trim();
	if (value === "") return null;

	return value.replace(/^(\d+(?:\.\d+)?)\s*(GB|TB)$/i, "$1 $2");
}

/**
 * The label of one variant in the capacity selector: capacity first, then the
 * colour, then a plain single-presentation label.
 */
export function variantLabel(
	storage: string | null,
	color: string | null,
): string {
	const capacity = formatStorage(storage);
	if (capacity !== null) return color === null ? capacity : `${capacity} · ${color}`;

	return color ?? "Única presentación";
}

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
