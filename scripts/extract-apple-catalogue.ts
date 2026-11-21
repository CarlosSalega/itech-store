import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Category } from "../src/generated/prisma/enums";

import { categoryFromName, normaliseName, REQUESTED_APPLE_PRODUCTS, selectRequested, slugFromName, storagesFromName } from "../src/features/catalog/seed/apple-catalogue";
import { skuFor } from "../src/features/catalog/seed/sku";
import { preserveLocalPhotographs } from "../src/features/catalog/seed/image-preservation";
import { familyFolder } from "../src/features/catalog/seed/source-mapping";

const BASE_URL = process.env.APPLE_SOURCE_URL;
const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "prisma", "seed", "products-apple.json");

const DESCRIPTION: Record<Category, string> = {
	IPHONE: "iPhone. Consultanos por colores, capacidad y disponibilidad.",
	IPAD: "iPad. Consultanos por capacidad, conectividad y disponibilidad.",
	MAC: "Mac. Consultanos por configuración y disponibilidad.",
	WATCH: "Apple Watch. Consultanos por correas y disponibilidad.",
	AIRPODS: "AirPods. Consultanos por disponibilidad.",
	ACCESSORY: "Accesorio de Apple. Consultanos por compatibilidad.",
};

type SourceRow = {
	name: string;
	image: string;
};

type CatalogueVariant = { sku: string; storage: string | null };

type CatalogueProduct = {
	slug: string;
	name: string;
	description: string;
	category: Category;
	images: string[];
	variants: CatalogueVariant[];
};

function safeMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);

	return message.replace(/https?:\/\/[^\s"']+/g, "<url>");
}

function decodeEntities(value: string): string {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&");
}

function attribute(tag: string, name: string): string | null {
	const match = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(tag);

	return match ? decodeEntities(match[1]) : null;
}

function parseRows(html: string): SourceRow[] {
	const rows: SourceRow[] = [];

	for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
		const name = attribute(tag, "alt")?.trim() ?? "";
		const src = attribute(tag, "src");

		if (name === "" || src === null || src === "") {
			continue;
		}

		rows.push({ name, image: new URL(src, BASE_URL).toString() });
	}

	return rows;
}

async function fetchText(address: string): Promise<string> {
	const response = await fetch(address, {
		headers: { "user-agent": "Mozilla/5.0 (compatible; catalogue-extraction)" },
	});

	if (!response.ok) {
		throw new Error(`listing request failed with status ${response.status}`);
	}

	return response.text();
}

async function downloadImage(
	row: SourceRow,
	slug: string,
	family: Category,
): Promise<string> {
	const response = await fetch(row.image, {
		headers: { "user-agent": "Mozilla/5.0 (compatible; catalogue-extraction)" },
	});

	if (!response.ok) {
		throw new Error(`photograph request failed with status ${response.status}`);
	}

	const bytes = Buffer.from(await response.arrayBuffer());

	if (bytes.subarray(0, 4).toString("ascii") !== "RIFF" || bytes.subarray(8, 12).toString("ascii") !== "WEBP") {
		throw new Error("photograph is not a webp file");
	}

	const reference = `${familyFolder(family)}/${slug}-1.webp`;
	const destination = path.join(ROOT, "public", reference);

	await mkdir(path.dirname(destination), { recursive: true });
	await writeFile(destination, bytes);

	return reference;
}

function flagValue(name: string): number | null {
	const prefix = `--${name}=`;
	const match = process.argv.find((argument) => argument.startsWith(prefix));

	if (!match) {
		return null;
	}

	const parsed = Number.parseInt(match.slice(prefix.length), 10);

	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function main(): Promise<void> {
	const dryRun = process.argv.includes("--dry-run");
	const limit = flagValue("limit");

	if (!BASE_URL) {
		throw new Error("APPLE_SOURCE_URL is not set");
	}

	const rows = parseRows(await fetchText(BASE_URL));
	const selection = selectRequested(
		rows.map((row) => row.name),
		REQUESTED_APPLE_PRODUCTS,
	);
	const wanted = limit === null ? selection.present : selection.present.slice(0, limit);

	const rowByName = new Map<string, SourceRow>();

	for (const row of rows) {
		const key = normaliseName(row.name);

		if (!rowByName.has(key)) {
			rowByName.set(key, row);
		}
	}

	const products: CatalogueProduct[] = [];
	const slugs = new Set<string>();
	const skipped: string[] = [];
	let preservedCount = 0;

	const previousImages = new Map<string, string[]>();

	if (!dryRun && existsSync(DATA_FILE)) {
		for (const product of JSON.parse(readFileSync(DATA_FILE, "utf8")) as CatalogueProduct[]) {
			previousImages.set(product.slug, product.images);
		}
	}

	for (const name of wanted) {
		const row = rowByName.get(normaliseName(name));
		const category = categoryFromName(name);

		if (row === undefined || category === null) {
			skipped.push(`${name} (no usable row or family)`);
			continue;
		}

		const slug = slugFromName(name);

		if (slugs.has(slug)) {
			throw new Error(`two products resolve to the same address: ${slug}`);
		}

		slugs.add(slug);

		const storages = storagesFromName(name);
		const variants: CatalogueVariant[] =
			storages.length === 0
				? [{ sku: skuFor(slug, null), storage: null }]
				: storages.map((storage) => ({ sku: skuFor(slug, storage), storage }));

		const downloaded = dryRun ? [] : [await downloadImage(row, slug, category)];
		const preserved = preserveLocalPhotographs(
			downloaded,
			previousImages.get(slug) ?? null,
		);

		preservedCount += preserved.preserved.length;

		products.push({
			slug,
			name,
			description: DESCRIPTION[category],
			category,
			images: preserved.images,
			variants,
		});

		console.log(
			`  ${category.padEnd(9)} ${slug.padEnd(30)} ${variants.length} variant(s)`,
		);
	}

	if (dryRun) {
		console.log("\nDry run: no photograph downloaded and no data written.");
	} else {
		await writeFile(DATA_FILE, `${JSON.stringify(products, null, "\t")}\n`);
		console.log(`\nWrote ${products.length} product(s) and their photographs.`);
		console.log(`Photographs kept from the existing file: ${preservedCount}`);
	}

	console.log(`Rows read from the listing: ${rows.length}`);
	console.log(`Products imported: ${products.length}`);

	if (skipped.length > 0) {
		console.log(`Rows skipped: ${skipped.length}`);
		for (const entry of skipped) {
			console.log(`  ${entry}`);
		}
	}

	if (selection.missing.length > 0) {
		console.log(`\nRequested but not listed: ${selection.missing.length}`);
		for (const name of selection.missing) {
			console.log(`  ${name}`);
		}
	}
}

main().catch((error: unknown) => {
	console.error(`Extraction failed: ${safeMessage(error)}`);
	process.exitCode = 1;
});
