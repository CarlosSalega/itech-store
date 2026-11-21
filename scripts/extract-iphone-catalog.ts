import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
	imageAssetCandidates,
	imageDestination,
	mapSourceProduct,
	type CatalogProduct,
	type SourceProduct,
} from "../src/features/catalog/seed/source-mapping";

const BASE_URL = process.env.IPHONE_SOURCE_URL;
const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "prisma", "seed", "products-iphone.json");

const BUNDLE_PATTERN = /\/assets\/index-[A-Za-z0-9_-]+\.js/;
const KEY_PATTERN = /eyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]{8,}){2}/g;
const ORIGIN_PATTERN = /https:\/\/[A-Za-z0-9.-]{4,}/g;
const EMBEDDED_PATTERN = /JSON\.parse\(\s*'((?:[^'\\]|\\.)*)'\s*\)/g;
const ORIGIN_CANDIDATE_LIMIT = 8;

function safeMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);

	return message
		.replace(/https?:\/\/[^\s"']+/g, "<url>")
		.replace(/eyJ[A-Za-z0-9._-]+/g, "<key>");
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

async function fetchBytes(url: string): Promise<{ bytes: Buffer; contentType: string }> {
	const response = await fetch(url, {
		headers: { "user-agent": "Mozilla/5.0 (compatible; catalog-extraction)" },
	});

	if (!response.ok) {
		throw new Error(`request failed with status ${response.status}`);
	}

	return {
		bytes: Buffer.from(await response.arrayBuffer()),
		contentType: response.headers.get("content-type") ?? "",
	};
}

export function bundlePath(html: string): string | null {
	const match = html.match(BUNDLE_PATTERN);

	return match ? match[0] : null;
}

function nearestKeyDistance(bundle: string, index: number): number {
	let best = Number.POSITIVE_INFINITY;

	for (const match of bundle.matchAll(KEY_PATTERN)) {
		best = Math.min(best, Math.abs((match.index ?? 0) - index));
	}

	return best;
}

export function originCandidates(bundle: string, exclude: string[]): string[] {
	const excluded = new Set(exclude.map((origin) => origin.replace(/\/$/, "")));
	const seen = new Set<string>();
	const ranked: { origin: string; distance: number }[] = [];

	for (const match of bundle.matchAll(ORIGIN_PATTERN)) {
		const origin = (match[0] ?? "").replace(/[.]+$/, "");
		if (origin === "" || excluded.has(origin) || seen.has(origin)) continue;

		seen.add(origin);
		ranked.push({ origin, distance: nearestKeyDistance(bundle, match.index ?? 0) });
	}

	return ranked
		.sort((a, b) => a.distance - b.distance)
		.slice(0, ORIGIN_CANDIDATE_LIMIT)
		.map((entry) => entry.origin);
}

export function bundleKey(bundle: string): string | null {
	const keys = [...bundle.matchAll(KEY_PATTERN)].map((match) => match[0] ?? "");

	return keys[0] ?? null;
}

export function embeddedCatalog(bundle: string): SourceProduct[] | null {
	for (const match of bundle.matchAll(EMBEDDED_PATTERN)) {
		const raw = match[1] ?? "";
		const attempts = [raw, raw.replace(/\\(.)/g, "$1")];

		for (const attempt of attempts) {
			if (!attempt.includes('"id"')) continue;

			try {
				const parsed: unknown = JSON.parse(attempt);
				if (Array.isArray(parsed) && parsed.length > 0) {
					return parsed as SourceProduct[];
				}
			} catch {
			}
		}
	}

	return null;
}

async function fetchCatalog(origin: string, key: string): Promise<SourceProduct[] | null> {
	const url = new URL("/rest/v1/products?select=*,variants(*)&order=created_at.desc", origin);
	const response = await fetch(url, {
		headers: { apikey: key, accept: "application/json" },
	});

	if (!response.ok) {
		throw new Error(`catalog service replied with status ${response.status}`);
	}

	const payload: unknown = await response.json();

	return Array.isArray(payload) ? (payload as SourceProduct[]) : null;
}

function isPng(bytes: Buffer): boolean {
	return (
		bytes.length > 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	);
}

function parseArgs(argv: string[]): { dryRun: boolean; limit: number | null } {
	const dryRun = argv.includes("--dry-run");
	const limitArg = argv.find((arg) => arg.startsWith("--limit="));
	const parsed = limitArg ? Number.parseInt(limitArg.slice("--limit=".length), 10) : Number.NaN;

	return {
		dryRun,
		limit: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
	};
}

async function main(): Promise<void> {
	if (!BASE_URL) {
		throw new Error(
			"IPHONE_SOURCE_URL is not set. Export it with the phone catalog's base URL before running.",
		);
	}

	const { dryRun, limit } = parseArgs(process.argv.slice(2));
	const base = BASE_URL.replace(/\/$/, "");
	const origin = new URL(base).origin;

	const html = await fetchText(`${base}/`);
	const bundle = bundlePath(html);
	if (!bundle) {
		throw new Error("the page did not advertise a bundle; refusing to guess its path");
	}

	const bundleSource = await fetchText(new URL(bundle, base).toString());
	const key = bundleKey(bundleSource);

	let records: SourceProduct[] = [];
	let usedFallback = false;

	if (key) {
		for (const candidate of originCandidates(bundleSource, [origin])) {
			try {
				const catalog = await fetchCatalog(candidate, key);
				if (catalog && catalog.length > 0) {
					records = catalog;
					break;
				}
			} catch (error) {
				console.warn(`origin candidate rejected: ${safeMessage(error)}`);
			}
		}
	}

	if (records.length === 0) {
		const fallback = embeddedCatalog(bundleSource);
		if (!fallback) {
			throw new Error("neither the catalog service nor the embedded catalog could be read");
		}

		records = fallback;
		usedFallback = true;
	}

	console.log(`source used: ${usedFallback ? "embedded fallback" : "catalog service"}`);
	console.log(`records read: ${records.length}`);

	const products: CatalogProduct[] = [];
	const slugs = new Set<string>();

	for (const record of records) {
		const mapped = mapSourceProduct(record);
		if (!mapped || slugs.has(mapped.slug)) continue;

		slugs.add(mapped.slug);
		products.push(mapped);
	}

	const limited = limit ? products.slice(0, limit) : products;
	console.log(`phone products: ${limited.length} of ${products.length}`);

	if (dryRun) {
		for (const product of limited) {
			console.log(
				`  ${product.slug} | ${product.name} | ` +
					`variants=${product.variants.map((variant) => variant.storage ?? "—").join(",")} | ` +
					`image=${imageAssetCandidates(product.name).join(" → ")}`,
			);
		}
		console.log("\ndry run: nothing written");

		return;
	}

	await mkdir(path.dirname(DATA_FILE), { recursive: true });

	const written: CatalogProduct[] = [];
	let imagesWritten = 0;
	let imagesSkipped = 0;

	for (const [index, product] of limited.entries()) {
		const images: string[] = [];

		try {
			let bytes: Uint8Array | null = null;
			for (const candidate of imageAssetCandidates(product.name)) {
				const asset = new URL(candidate, base).toString();
				const fetched = await fetchBytes(asset);
				if (isPng(fetched.bytes)) {
					bytes = fetched.bytes;
					break;
				}
			}

			if (bytes === null) {
				throw new Error("no candidate asset is a PNG");
			}

			const destination = imageDestination(product.slug);
			const target = path.join(ROOT, "public", destination);
			await mkdir(path.dirname(target), { recursive: true });
			await writeFile(target, bytes);
			images.push(destination);
			imagesWritten += 1;
		} catch (error) {
			imagesSkipped += 1;
			console.warn(`image skipped for ${product.slug}: ${safeMessage(error)}`);
		}

		written.push({ ...product, images });

		console.log(
			`[${index + 1}/${limited.length}] ${product.slug} — ${images.length} images, ` +
				`${product.variants.length} variants`,
		);
	}

	await writeFile(DATA_FILE, `${JSON.stringify(written, null, "\t")}\n`, "utf8");

	console.log(
		`\nwrote ${written.length} products, ${imagesWritten} images ` +
			`(${imagesSkipped} skipped) to public/products`,
	);
	console.log(`wrote ${path.relative(ROOT, DATA_FILE)}`);
	console.log("prices and stock are intentionally absent: they are sample data, added by the seed");
}

main().catch((error: unknown) => {
	console.error(safeMessage(error));
	process.exit(1);
});
