import type { Category } from "@/generated/prisma/enums";

const ACCESSORY_TOKEN =
	/pencil|keyboard|teclado|adaptador|cargador|cable|airtag|homepod|studio display|apple tv|soporte|beats|funda|protector|templado|pantalla/;

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

const FAMILY_TOKENS: readonly (readonly [Category, RegExp])[] = [
	["IPHONE", /iphone/],
	["WATCH", /\bwatch\b/],
	["AIRPODS", /airpods/],
	["IPAD", /\bipad\b/],
	["MAC", /macbook|\bimac\b|mac mini|\bmac\b/],
];

const APPLE_TOKEN =
	/apple|iphone|ipad|macbook|\bimac\b|mac mini|\bmac\b|\bwatch\b|airpods|pencil|airtag|homepod|studio display|apple tv/;

const LEADING_BRAND = /^apple\s+/;

const REPEATED_BRAND = /^(?:apple\s)+/;

export function normaliseName(name: string): string {
	const words = name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

	return words.replace(REPEATED_BRAND, "apple ").trim();
}

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

	return null;
}

export function slugFromName(name: string): string {
	return normaliseName(name).replace(LEADING_BRAND, "").replace(/\s+/g, "-");
}

const STORAGE_RANGE = /(\d{2,4})\s*[-\u2013]\s*(\d{2,4})\s*(gb|tb)/gi;
const STORAGE_SINGLE = /(\d{2,4})\s*(gb|tb)/gi;

export function storagesFromName(name: string): string[] {
	const sources: string[] = [];
	const ranges = [...name.matchAll(STORAGE_RANGE)];

	if (ranges.length > 0) {
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

export function skuFor(slug: string, storage: string | null): string {
	if (storage === null) {
		return slug;
	}

	return `${slug}-${storage.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

export type AppleSelection = {
	present: string[];
	missing: string[];
};

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
