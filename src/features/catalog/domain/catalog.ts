import type { Category } from "@/generated/prisma/enums";

export const PLACEHOLDER_IMAGE = "/placeholder.webp";

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

export const NAV_FAMILIES = FAMILY_ORDER.filter(
	(category) => category !== "IPHONE",
);

export const FAMILY_SLUG = {
	MAC: "mac",
	IPAD: "ipad",
	WATCH: "watch",
	AIRPODS: "airpods",
	ACCESSORY: "accessory",
	IPHONE: "iphone",
} as const satisfies Record<Category, string>;

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

export function formatStorage(storage: string | null): string | null {
	if (storage === null) return null;

	const value = storage.trim();
	if (value === "") return null;

	return value.replace(/^(\d+(?:\.\d+)?)\s*(GB|TB)$/i, "$1 $2");
}

export function variantLabel(
	storage: string | null,
	color: string | null,
): string {
	const capacity = formatStorage(storage);
	if (capacity !== null) return color === null ? capacity : `${capacity} · ${color}`;

	return color ?? "Única presentación";
}

export type CatalogCard = {
	slug: string;
	name: string;
	category: Category;
	image: string | null;
	imageAlt: string | null;
	priceFrom: number | null;
};
