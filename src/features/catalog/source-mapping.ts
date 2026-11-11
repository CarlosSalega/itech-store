/**
 * Pure mapping between the second catalog source's product records and this
 * project's seed shape. No I/O lives here so the rules stay testable.
 *
 * The source's identifiers, condition words and asset naming are the only
 * things this module knows about; it never sees a host or a URL from the
 * source, and it never carries a price or a stock value, both of which the
 * seed generates as sample data.
 */

/** A variant row as the source's API returns it. */
export type SourceVariant = {
	storage?: string | null;
	color?: string | null;
	battery?: string | null;
	price?: number | null;
	stock_status?: string | null;
};

/** A product record as the source's API (or its embedded fallback) returns it. */
export type SourceProduct = {
	id: string;
	name: string;
	category?: string | null;
	price?: number | null;
	currency?: string | null;
	image?: string | null;
	description?: string | null;
	storages?: string[] | null;
	colors?: string[] | null;
	variants?: SourceVariant[] | null;
};

export type CatalogVariant = {
	sku: string;
	storage: string | null;
};

export type CatalogProduct = {
	slug: string;
	name: string;
	description: string;
	category: "IPHONE";
	images: string[];
	variants: CatalogVariant[];
};

/** Source condition words that mark a record as a sealed unit. */
const SEALED = "sellados";
/** Source condition word that marks a record as a used unit. */
const USED = "usados";
/** Suffix appended to a used unit's display name. */
const USED_SUFFIX = " (usado)";
/** Every phone asset on the source carries this prefix. */
const ASSET_PREFIX = "iphone";

/** Kebab-case a free text value, dropping accents and quotes. */
export function kebab(text: string): string {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/["'`´]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * The source has no separate slug: its `id` is the slug, sometimes prefixed
 * with `u-` for used units, so the prefix is stripped.
 */
export function slugFromId(id: string): string {
	return kebab(id.replace(/^u-/i, ""));
}

/**
 * Only phones belong here: the source labels them `Sellados` or `Usados`, and
 * a record named after the family is accepted regardless of its label.
 */
export function isIphoneProduct(product: SourceProduct): boolean {
	const category = (product.category ?? "").trim().toLowerCase();
	if (category === SEALED || category === USED) return true;

	return product.name.trim().toLowerCase().startsWith(ASSET_PREFIX);
}

/** The condition rides on the name, because the destination has no field for it. */
export function displayName(product: SourceProduct): string {
	const name = product.name.trim();
	const used = (product.category ?? "").trim().toLowerCase() === USED;

	if (!used || name.toLowerCase().endsWith(USED_SUFFIX)) return name;

	return `${name}${USED_SUFFIX}`;
}

/** Storage values differ only in spelling: `1 TB`, `1TB` and `1 tb` are one row. */
function storageKey(storage: string): string {
	return storage.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Variants carry a colour the destination cannot store, so they collapse to one
 * row per distinct capacity. First-seen spelling survives, order is preserved.
 */
export function collapseStorages(product: SourceProduct): string[] {
	const rows = [
		...(product.variants ?? []).map((variant) => variant.storage ?? ""),
		...(product.storages ?? []),
	];

	const kept: string[] = [];
	const seen = new Set<string>();

	for (const row of rows) {
		const storage = row.trim();
		const key = storageKey(storage);

		if (key === "" || seen.has(key)) continue;

		seen.add(key);
		kept.push(storage);
	}

	return kept;
}

/** SKU per variant: the slug plus the storage, lowercased, non-alphanumerics stripped. */
export function skuFor(slug: string, storage: string | null): string {
	if (storage === null) return slug;

	const key = storageKey(storage);

	return key === "" ? slug : `${slug}-${key}`;
}

/**
 * The site's own photography is served per product under a frozen naming
 * convention: the family prefix plus the kebab-cased name. A name that already
 * carries the prefix is not prefixed twice.
 */
export function imageAssetPath(name: string): string {
	const kebabName = kebab(name);
	const asset = kebabName.startsWith(`${ASSET_PREFIX}-`) || kebabName === ASSET_PREFIX
		? kebabName
		: `${ASSET_PREFIX}-${kebabName}`;

	return `/products/${asset}.png`;
}

/**
 * Asset candidates for a product name, in the order they should be tried.
 *
 * The display name carries a condition suffix ("(usado)") that stays in the name
 * and the slug, because the schema will model conditions properly later. The site,
 * however, serves one photo per model, so the bare model name is the fallback. The
 * caller keeps the first candidate that is actually an image.
 */
export function imageAssetCandidates(name: string): string[] {
	const candidates = [imageAssetPath(name)];
	const bare = name.replace(/\s*\([^)]*\)\s*$/, "").trim();

	if (bare.length > 0 && bare !== name) {
		const fallback = imageAssetPath(bare);
		if (!candidates.includes(fallback)) candidates.push(fallback);
	}

	return candidates;
}

/** Where the downloaded file lands inside this project. */
export function imageDestination(slug: string): string {
	return `/products/${slug}-1.png`;
}

/** One source record becomes one destination product, or nothing at all. */
export function mapSourceProduct(product: SourceProduct): CatalogProduct | null {
	if (!isIphoneProduct(product)) return null;

	const slug = slugFromId(product.id);
	const storages = collapseStorages(product);

	return {
		slug,
		name: displayName(product),
		description: (product.description ?? "").trim(),
		category: "IPHONE",
		images: [imageDestination(slug)],
		variants: storages.map((storage) => ({ sku: skuFor(slug, storage), storage })),
	};
}
