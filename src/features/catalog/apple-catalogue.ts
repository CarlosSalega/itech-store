import type { Category } from "@/generated/prisma/enums";

/**
 * The rules that turn a catalogue row of a third source into something this store can
 * own. Kept pure and free of fetching so the decisions can be tested: a wrong family
 * files a product on the wrong wall, and a wrong selection either sells a model twice
 * or loses it silently.
 *
 * Nothing here knows, or may learn, where the names came from. The caller passes names
 * in and gets names out.
 */

/**
 * A word that only ever appears on something that complements a device. Checked before
 * the device families, because "Magic Keyboard iPad" must not be filed as an iPad.
 */
const ACCESSORY_TOKEN =
	/pencil|keyboard|teclado|adaptador|cargador|cable|airtag|homepod|studio display|apple tv|soporte|beats|funda|protector|templado|pantalla/;

/**
 * The products to import, by Apple product name, reviewed and chosen by the owner.
 *
 * This list is the whole policy. The source offers far more Apple products, but the
 * store already sells most of them under a different naming from another source, and a
 * second entry for the same model is a defect on the wall, not extra catalogue. Adding a
 * model here is a deliberate act; it is never inferred from what the source happens to
 * list today.
 *
 * It lives here, next to the classifier that reads the names, so a test can prove that
 * every name in it resolves to a family: a non-Apple or misspelt name would otherwise be
 * skipped silently by the extraction.
 */
export const REQUESTED_APPLE_PRODUCTS = [
	"iPhone 18 Pro - 256 GB",
	"iPhone 18 Pro Max",
	"iPhone Duo 256 - 512 GB",
	"Apple Watch SE 3 40mm",
	"Apple Watch SE 3 40mm Starlight",
	"Apple Magic Keyboard iPad White",
	"Apple Pencil Pro",
	"Apple PENCIL USB-C",
	"Apple Adaptador 20w original",
] as const;

/** Families in the order they are tried. Family words do not overlap on purpose. */
const FAMILY_TOKENS: readonly (readonly [Category, RegExp])[] = [
	["IPHONE", /iphone/],
	["WATCH", /\bwatch\b/],
	["AIRPODS", /airpods/],
	["IPAD", /\bipad\b/],
	["MAC", /macbook|\bimac\b|mac mini|\bmac\b/],
];

/**
 * A product is in scope only when the name carries an Apple brand or product word. The
 * source mixes other brands and unbranded parts into the same listing, and a generic
 * "cargador" would otherwise land in ACCESSORY by its own vocabulary.
 */
const APPLE_TOKEN =
	/apple|iphone|ipad|macbook|\bimac\b|mac mini|\bmac\b|\bwatch\b|airpods|pencil|airtag|homepod|studio display|apple tv/;

/** The leading brand article this store never repeats in an address. */
const LEADING_BRAND = /^apple\s+/;

/** A brand word typed more than once in front of a name: "Apple Apple Watch". */
const REPEATED_BRAND = /^(?:apple\s)+/;

/**
 * Case, accent and punctuation insensitive form used for every comparison. Words are the
 * unit: "USB-C" and "USB C" are the same product, and so are "–" and "-".
 */
export function normaliseName(name: string): string {
	const words = name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

	// A source may carry "Apple Apple Watch SE 3 40mm", the brand typed on top of an
	// already branded name. It is one product, and the store names it once.
	return words.replace(REPEATED_BRAND, "apple ").trim();
}

/**
 * The family a product belongs to, or `null` when it is not an Apple product at all.
 */
export function categoryFromName(name: string): Category | null {
	const normalised = normaliseName(name);

	if (normalised === "" || !APPLE_TOKEN.test(normalised)) {
		return null;
	}

	if (ACCESSORY_TOKEN.test(normalised)) {
		return "ACCESSORY";
	}

	for (const [category, pattern] of FAMILY_TOKENS) {
		if (pattern.test(normalised)) {
			return category;
		}
	}

	// An Apple product with no recognisable family stays out: guessing a wall for it is
	// how a HomePod ends up filed under IPHONE by the letter of a pattern.
	return null;
}

/**
 * The address this store will own for the product. Derived from the name because the
 * source's own identifiers are not allowed into the repository.
 */
export function slugFromName(name: string): string {
	return normaliseName(name).replace(LEADING_BRAND, "").replace(/\s+/g, "-");
}

/** A capacity written as a range, for example "256 - 512 GB". */
const STORAGE_RANGE = /(\d{2,4})\s*[-\u2013]\s*(\d{2,4})\s*(gb|tb)/gi;
/** A capacity written on its own, for example "256GB" or "1 TB". */
const STORAGE_SINGLE = /(\d{2,4})\s*(gb|tb)/gi;

/**
 * The capacities a product is sold by, read out of its name. The variant selector is
 * built from this, so a power rating such as "20w" must never be mistaken for one.
 */
export function storagesFromName(name: string): string[] {
	const sources: string[] = [];
	const ranges = [...name.matchAll(STORAGE_RANGE)];

	if (ranges.length > 0) {
		// A range is two capacities, and reading it again as a lone number would
		// duplicate its upper end.
		for (const match of ranges) {
			const unit = match[3].toUpperCase();

			sources.push(`${match[1]}${unit}`, `${match[2]}${unit}`);
		}
	} else {
		for (const match of name.matchAll(STORAGE_SINGLE)) {
			sources.push(`${match[1]}${match[2].toUpperCase()}`);
		}
	}

	return [...new Set(sources)];
}

/**
 * The SKU a variant is stored under. Capacity-qualified when there is a capacity, so the
 * same product sold by 256GB and 512GB never collides on the unique SKU.
 */
export function skuFor(slug: string, storage: string | null): string {
	if (storage === null) {
		return slug;
	}

	return `${slug}-${storage.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

export type AppleSelection = {
	/** Requested names the source actually lists, in the order they were requested. */
	present: string[];
	/** Requested names the source no longer lists. Reported, never dropped in silence. */
	missing: string[];
};

/**
 * Decides which of the requested products to import.
 *
 * The selection is an explicit list of Apple product names reviewed by the owner, never
 * everything a source offers: the store already sells most of this catalogue under
 * another source's naming, and importing a name it does not ask for is how one model
 * ends up sold twice. A requested name the source stopped listing is reported so a
 * rename upstream cannot quietly remove a product from the store.
 */
export function selectRequested(
	sourceNames: readonly string[],
	requested: readonly string[],
): AppleSelection {
	const available = new Set(sourceNames.map(normaliseName));
	const present: string[] = [];
	const missing: string[] = [];
	const seen = new Set<string>();

	for (const name of requested) {
		const key = normaliseName(name);

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);

		if (available.has(key)) {
			present.push(name);
		} else {
			missing.push(name);
		}
	}

	return { present, missing };
}
