import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { familyFolder } from "../src/features/catalog/source-mapping";

/**
 * One-off extraction of catalog facts (name, description, images, capacity)
 * from the store's existing site into files this project owns.
 *
 * The source base URL is read from CATALOG_SOURCE_URL and is deliberately
 * never printed: the repository must carry no reference to the source site.
 */

const BASE_URL = process.env.CATALOG_SOURCE_URL;
const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "prisma", "seed", "products.json");

const MAX_IMAGES_PER_PRODUCT = 5;
/** Site furniture (headers, banners, generic renders) is reused across products. */
const MAX_PRODUCTS_SHARING_ASSET = 5;
const IMAGE_EXTENSIONS = ["webp", "jpg", "jpeg", "png"] as const;
const IMAGE_URL_PATTERN = /https:\/\/[^"'\s]+\/products\/[^"'\s]+?\.(?:webp|jpe?g|png)/gi;
const SIZE_TOKEN_PATTERN = /-(\d+)-(\d+)(\.(?:webp|jpe?g|png))$/i;

type Category = "IPHONE" | "MAC" | "IPAD" | "WATCH" | "AIRPODS" | "ACCESSORY";

export type ExtractedVariant = {
	sku: string;
	storage: string | null;
};

export type ExtractedProduct = {
	slug: string;
	name: string;
	description: string;
	category: Category;
	images: string[];
	variants: ExtractedVariant[];
};

export type PageFacts = {
	url: string;
	title: string;
	description: string;
	images: string[];
};

/**
 * Capacity tokens are ambiguous: the same "36GB" can be unified memory or
 * storage. A token counts as memory when a memory word follows it, and as
 * storage when a disk word does.
 */
const CAPACITY_SOURCE = "\\d+(?:[.,]\\d+)?\\s?(?:gb|tb)";
const MEMORY_QUALIFIER_SOURCE = "ram|memoria|unificada";
const DISK_QUALIFIER_SOURCE = "ssd|hdd|almacenamiento|disco";
const QUALIFIER_SOURCE = `${MEMORY_QUALIFIER_SOURCE}|${DISK_QUALIFIER_SOURCE}`;

const CAPACITY_PATTERN = new RegExp(`\\b(${CAPACITY_SOURCE})\\b`, "gi");
const MEMORY_QUALIFIER_PATTERN = new RegExp(
	`^[\\s,/-]{0,4}(?:${MEMORY_QUALIFIER_SOURCE})\\b`,
	"i",
);
const DISK_QUALIFIER_PATTERN = new RegExp(`^[\\s,/-]{0,4}(?:${DISK_QUALIFIER_SOURCE})\\b`, "i");
const CAPACITY_WITH_QUALIFIER_PATTERN = new RegExp(
	`(?:\\b(?:${QUALIFIER_SOURCE})\\b[\\s,/-]*)?` +
		`\\b${CAPACITY_SOURCE}\\b` +
		`(?:[\\s,/-]*\\b(?:${QUALIFIER_SOURCE})\\b)?`,
	"gi",
);

type CapacityToken = {
	value: string;
	memory: boolean;
	disk: boolean;
};

function capacityTokens(text: string): CapacityToken[] {
	const tokens: CapacityToken[] = [];

	for (const match of text.matchAll(CAPACITY_PATTERN)) {
		const raw = match[1];
		if (!raw) continue;

		const rest = text.slice((match.index ?? 0) + match[0].length);

		tokens.push({
			value: raw.replace(/\s+/g, "").toUpperCase(),
			memory: MEMORY_QUALIFIER_PATTERN.test(rest),
			disk: DISK_QUALIFIER_PATTERN.test(rest),
		});
	}

	return tokens;
}

/**
 * Returns the storage capacity, never the memory capacity: "36GB RAM" is
 * skipped, "1TB SSD" wins. Without any qualifier the first capacity is kept
 * ("256GB"), and a title that only qualifies memory yields no storage at all.
 */
export function parseStorage(text: string): string | null {
	const tokens = capacityTokens(text);
	const disk = tokens.find((token) => token.disk && !token.memory);
	if (disk) return disk.value;

	const unqualified = tokens.find((token) => !token.disk && !token.memory);

	return unqualified ? unqualified.value : null;
}

/** Removes capacities together with their qualifier word, leaving no stray "RAM". */
export function stripStorage(text: string): string {
	return text
		.replace(CAPACITY_WITH_QUALIFIER_PATTERN, " ")
		.replace(/(?:\s*[-/|]){2,}/g, " - ")
		.replace(/\s{2,}/g, " ")
		.replace(/^[\s/|-]+|[\s/|-]+$/g, "");
}

export function slugify(text: string): string {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/["']/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function inferCategory(name: string): Category {
	if (/iphone/i.test(name)) return "IPHONE";
	if (/ipad/i.test(name)) return "IPAD";
	if (/airpods?/i.test(name)) return "AIRPODS";
	if (/watch/i.test(name)) return "WATCH";
	if (/macbook|imac|mac\s?mini|mac\s?studio|mac\s?pro|\bmac\b/i.test(name)) return "MAC";

	return "ACCESSORY";
}

/**
 * The CDN only serves renditions it has already generated: requesting another
 * width returns 403. So instead of guessing a size, keep the widest rendition
 * the page actually advertises for each asset.
 */
export function assetKey(url: string): string {
	const clean = url.split("?")[0] ?? url;

	return clean.replace(SIZE_TOKEN_PATTERN, "$3");
}

export function renditionWidth(url: string): number {
	const clean = url.split("?")[0] ?? url;
	const match = clean.match(SIZE_TOKEN_PATTERN);

	return match && match[1] ? Number.parseInt(match[1], 10) : 0;
}

export function pickLargestRenditions(urls: string[]): string[] {
	const best = new Map<string, string>();

	for (const url of urls) {
		const clean = url.split("?")[0] ?? url;
		const key = assetKey(clean);
		const current = best.get(key);

		if (!current || renditionWidth(clean) > renditionWidth(current)) {
			best.set(key, clean);
		}
	}

	return [...best.values()];
}

function decodeEntities(text: string): string {
	return text
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&nbsp;/g, " ");
}

function metaContent(html: string, property: string): string | null {
	const pattern = new RegExp(
		`<meta\\s+property="${property}"\\s+content="([^"]*)"`,
		"i",
	);
	const match = html.match(pattern);

	return match && match[1] ? decodeEntities(match[1]) : null;
}

export function extractPageFacts(html: string, url: string): PageFacts {
	const title = metaContent(html, "og:title") ?? "";
	const description = metaContent(html, "og:description") ?? "";
	const ogImage = metaContent(html, "og:image:secure_url") ?? metaContent(html, "og:image");

	const candidates: string[] = [];
	if (ogImage) candidates.push(ogImage);

	for (const match of html.matchAll(IMAGE_URL_PATTERN)) {
		candidates.push(match[0]);
	}

	const images = pickLargestRenditions(candidates).filter((candidate) => {
		const lower = candidate.toLowerCase();

		return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(`.${extension}`));
	});

	return { url, title, description, images };
}

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: { "user-agent": "Mozilla/5.0 (compatible; catalog-extraction)" },
	});

	if (!response.ok) {
		throw new Error(`request failed with status ${response.status}`);
	}

	return response.text();
}

async function fetchBinary(url: string): Promise<Buffer> {
	const response = await fetch(url, {
		headers: { "user-agent": "Mozilla/5.0 (compatible; catalog-extraction)" },
	});

	if (!response.ok) {
		throw new Error(`request failed with status ${response.status}`);
	}

	return Buffer.from(await response.arrayBuffer());
}

function productUrlsFromSitemap(xml: string, baseUrl: string): string[] {
	const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? "");
	const origin = new URL(baseUrl).origin;

	return locs
		.filter((loc) => /\/productos\/[^/]+\/?$/.test(new URL(loc).pathname))
		.map((loc) => {
			// The sitemap may advertise the canonical host rather than the one
			// the caller configured; keep every request on the configured origin.
			const parsed = new URL(loc);
			const relative = `${parsed.pathname}${parsed.search}`;

			return new URL(relative, origin).toString();
		});
}

type Group = {
	slug: string;
	name: string;
	description: string;
	category: Category;
	imageUrls: string[];
	variants: ExtractedVariant[];
};

function groupPages(pages: PageFacts[]): Group[] {
	const groups = new Map<string, Group>();

	for (const page of pages) {
		const name = stripStorage(page.title);
		const slug = slugify(name);
		const storage = parseStorage(page.title);

		const existing = groups.get(slug);
		const group: Group =
			existing ??
			{
				slug,
				name,
				description: page.description,
				category: inferCategory(name),
				imageUrls: [],
				variants: [],
			};

		if (!existing) groups.set(slug, group);

		for (const image of page.images) {
			if (group.imageUrls.length >= MAX_IMAGES_PER_PRODUCT) break;

			const key = assetKey(image);
			if (group.imageUrls.some((kept) => assetKey(kept) === key)) continue;
			group.imageUrls.push(image);
		}

		const sku = storage ? `${slug}-${slugify(storage)}` : slug;
		if (!group.variants.some((variant) => variant.sku === sku)) {
			group.variants.push({ sku, storage });
		}
	}

	const grouped = [...groups.values()];
	pruneSharedImages(grouped);

	return grouped.sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Gallery slots beyond the first one are mostly site furniture: the same asset
 * is reused by dozens of unrelated products. Count how many distinct slugs use
 * each asset and drop the ones above the sharing budget. A product never loses
 * every image: its first image (the og:image) stays as a fallback.
 */
export function pruneSharedImages(groups: Group[]): void {
	const usage = new Map<string, Set<string>>();

	for (const group of groups) {
		for (const image of group.imageUrls) {
			const key = assetKey(image);
			const slugs = usage.get(key) ?? new Set<string>();
			slugs.add(group.slug);
			usage.set(key, slugs);
		}
	}

	for (const group of groups) {
		const kept = group.imageUrls.filter(
			(image) => (usage.get(assetKey(image))?.size ?? 0) <= MAX_PRODUCTS_SHARING_ASSET,
		);

		group.imageUrls = kept.length > 0 ? kept : group.imageUrls.slice(0, 1);
	}
}

function parseArgs(argv: string[]): { dryRun: boolean; limit: number | null } {
	const dryRun = argv.includes("--dry-run");
	const limitArg = argv.find((arg) => arg.startsWith("--limit="));
	const limit = limitArg ? Number.parseInt(limitArg.slice("--limit=".length), 10) : null;

	return { dryRun, limit: limit && Number.isFinite(limit) ? limit : null };
}

async function main(): Promise<void> {
	if (!BASE_URL) {
		throw new Error("CATALOG_SOURCE_URL is not set. Add it to your .env file.");
	}

	const { dryRun, limit } = parseArgs(process.argv.slice(2));
	const sitemapUrl = new URL("/sitemap.xml", BASE_URL).toString();
	const allUrls = productUrlsFromSitemap(await fetchText(sitemapUrl), BASE_URL);
	const urls = limit ? allUrls.slice(0, limit) : allUrls;

	console.log(`product pages: ${urls.length} of ${allUrls.length}`);

	const pages: PageFacts[] = [];
	for (const [index, url] of urls.entries()) {
		try {
			const facts = extractPageFacts(await fetchText(url), url);
			pages.push(facts);
			console.log(
				`[${index + 1}/${urls.length}] ${slugify(stripStorage(facts.title))} — ` +
					`storage=${parseStorage(facts.title) ?? "none"} images=${facts.images.length}`,
			);
		} catch (error) {
			console.warn(
				`[${index + 1}/${urls.length}] skipped: ${error instanceof Error ? error.message : error}`,
			);
		}
	}

	const groups = groupPages(pages);
	console.log(`\ngrouped into ${groups.length} products`);

	if (dryRun) {
		for (const group of groups) {
			console.log(
				`  ${group.slug} | ${group.category} | images=${group.imageUrls.length} | ` +
					`variants=${group.variants.map((variant) => variant.storage ?? "—").join(",")}`,
			);
		}
		console.log("\ndry run: nothing written");

		return;
	}

	await mkdir(path.dirname(DATA_FILE), { recursive: true });

	const products: ExtractedProduct[] = [];
	let totalBytes = 0;
	let totalImages = 0;

	for (const [index, group] of groups.entries()) {
		const images: string[] = [];
		// One folder per family: the reference and the file share the family, so a
		// downloaded photograph can never land at the flat root again.
		const folder = familyFolder(group.category);
		const folderDir = path.join(ROOT, "public", folder);

		await mkdir(folderDir, { recursive: true });

		for (const [imageIndex, url] of group.imageUrls.entries()) {
			const fileName = `${group.slug}-${imageIndex + 1}.webp`;
			try {
				const bytes = await fetchBinary(url);
				await writeFile(path.join(folderDir, fileName), bytes);
				totalBytes += bytes.byteLength;
				totalImages += 1;
				images.push(`${folder}/${fileName}`);
			} catch (error) {
				console.warn(
					`  image skipped for ${group.slug}: ${error instanceof Error ? error.message : error}`,
				);
			}
		}

		products.push({
			slug: group.slug,
			name: group.name,
			description: group.description,
			category: group.category,
			images,
			variants: group.variants,
		});

		console.log(
			`[${index + 1}/${groups.length}] ${group.slug} — ${images.length} images, ` +
				`${group.variants.length} variants`,
		);
	}

	await writeFile(DATA_FILE, `${JSON.stringify(products, null, "\t")}\n`, "utf8");

	console.log(
		`\nwrote ${products.length} products, ${totalImages} images ` +
			`(${(totalBytes / 1024 / 1024).toFixed(1)} MB) to public/products`,
	);
	console.log(`wrote ${path.relative(ROOT, DATA_FILE)}`);
	console.log("prices and stock are intentionally absent: they are sample data, added by the seed");
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
