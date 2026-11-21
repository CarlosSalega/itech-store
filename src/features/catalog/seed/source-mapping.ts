export type SourceVariant = {
	storage?: string | null;
	color?: string | null;
	battery?: string | null;
	price?: number | null;
	stock_status?: string | null;
};

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

const SEALED = "sellados";
const USED = "usados";
const USED_SUFFIX = " (usado)";
const ASSET_PREFIX = "iphone";

export type CatalogFamily =
	| "iphone"
	| "ipad"
	| "mac"
	| "watch"
	| "airpods"
	| "accessory";

const DEFAULT_FAMILY: CatalogFamily = "iphone";

export function familyFolder(
	family: CatalogFamily | Uppercase<CatalogFamily> = DEFAULT_FAMILY,
): string {
	return `/products/${family.toLowerCase()}`;
}

export function kebab(text: string): string {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/["'`´]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function slugFromId(id: string): string {
	return kebab(id.replace(/^u-/i, ""));
}

export function isIphoneProduct(product: SourceProduct): boolean {
	const category = (product.category ?? "").trim().toLowerCase();
	if (category === SEALED || category === USED) return true;

	return product.name.trim().toLowerCase().startsWith(ASSET_PREFIX);
}

export function displayName(product: SourceProduct): string {
	const name = product.name.trim();
	const used = (product.category ?? "").trim().toLowerCase() === USED;

	if (!used || name.toLowerCase().endsWith(USED_SUFFIX)) return name;

	return `${name}${USED_SUFFIX}`;
}

function storageKey(storage: string): string {
	return storage.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

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

export function skuFor(slug: string, storage: string | null): string {
	if (storage === null) return slug;

	const key = storageKey(storage);

	return key === "" ? slug : `${slug}-${key}`;
}

export function imageAssetPath(name: string, family: CatalogFamily = DEFAULT_FAMILY): string {
	const kebabName = kebab(name);
	const asset = kebabName.startsWith(`${ASSET_PREFIX}-`) || kebabName === ASSET_PREFIX
		? kebabName
		: `${ASSET_PREFIX}-${kebabName}`;

	return `${familyFolder(family)}/${asset}.png`;
}

export function imageAssetCandidates(
	name: string,
	family: CatalogFamily = DEFAULT_FAMILY,
): string[] {
	const candidates = [imageAssetPath(name, family)];
	const bare = name.replace(/\s*\([^)]*\)\s*$/, "").trim();

	if (bare.length > 0 && bare !== name) {
		const fallback = imageAssetPath(bare, family);
		if (!candidates.includes(fallback)) candidates.push(fallback);
	}

	return candidates;
}

export function imageDestination(
	slug: string,
	family: CatalogFamily = DEFAULT_FAMILY,
): string {
	return `${familyFolder(family)}/${slug}-1.png`;
}

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
