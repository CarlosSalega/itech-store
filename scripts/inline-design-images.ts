import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * The design canvas injects artboards through JavaScript, so a relative path
 * like `../../public/products/x.webp` resolves against the canvas page and
 * 404s. Self-contained artboards are the rule anyway, but the product photos
 * must never be committed, so they cannot be inlined into the tracked files.
 *
 * This script writes a parallel, gitignored design with every local image
 * embedded as a data URI, so the canvas can show the real photography while
 * the repository keeps zero product images.
 *
 * Run: pnpm design:photos
 */

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "design", "storefront");
const SYSTEM_BOARD = path.join(ROOT, "design", "system.html");
const OUT_DIR = path.join(ROOT, "design", "storefront-photos");

// Order matters: the public-prefixed form must win, otherwise the shorter
// `/placeholder.webp` alternative matches inside it and leaves `../../public`
// glued to the data URI.
const IMAGE_REFERENCE =
	/(?:\.\.\/)*public\/(?:products\/)?[A-Za-z0-9._-]+\.webp|\/placeholder\.webp/g;

const MIME: Record<string, string> = {
	webp: "image/webp",
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	svg: "image/svg+xml",
};

function resolveToFile(reference: string): string | null {
	const withoutParents = reference.replace(/^(\.\.\/)+/, "").replace(/^\//, "");
	const candidates = [path.join(ROOT, withoutParents), path.join(ROOT, "public", withoutParents)];

	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}

	return null;
}

function dataUri(file: string): string {
	const extension = path.extname(file).slice(1).toLowerCase();
	const mime = MIME[extension];

	if (!mime) throw new Error(`unsupported image type: ${extension}`);

	return `data:${mime};base64,${readFileSync(file).toString("base64")}`;
}

type Inline = { html: string; inlined: number; missing: string[] };

function inlineImages(html: string): Inline {
	const missing: string[] = [];
	const cache = new Map<string, string>();
	let inlined = 0;

	const output = html.replace(IMAGE_REFERENCE, (reference) => {
		if (!reference) return reference;

		const cached = cache.get(reference);
		if (cached) {
			inlined += 1;

			return cached;
		}

		const file = resolveToFile(reference);
		if (!file) {
			if (!missing.includes(reference)) missing.push(reference);

			return reference;
		}

		const uri = dataUri(file);
		cache.set(reference, uri);
		inlined += 1;

		return uri;
	});

	return { html: output, inlined, missing };
}

function copyWithImages(sourceFile: string, outputFile: string): Inline {
	const { html, inlined, missing } = inlineImages(readFileSync(sourceFile, "utf8"));

	// A reference that survives inlining means the canvas would render a broken
	// image silently, which is exactly the failure this script exists to avoid.
	const leftover = html.match(/[^"'\s]*\.webp/g)?.filter((hit) => !hit.startsWith("data:")) ?? [];
	if (leftover.length > 0) {
		throw new Error(
			`${path.basename(outputFile)} still references ${leftover.length} file(s), e.g. ${leftover[0]}`,
		);
	}

	mkdirSync(path.dirname(outputFile), { recursive: true });
	writeFileSync(outputFile, html, "utf8");

	return { html, inlined, missing };
}

function main(): void {
	mkdirSync(OUT_DIR, { recursive: true });

	const boards = readdirSync(SOURCE_DIR).filter((file) => file.endsWith(".html"));
	if (boards.length === 0) throw new Error("no artboards found to inline");

	let totalInlined = 0;
	const allMissing: string[] = [];

	for (const board of boards) {
		const result = copyWithImages(
			path.join(SOURCE_DIR, board),
			path.join(OUT_DIR, board),
		);
		totalInlined += result.inlined;
		allMissing.push(...result.missing);
		console.log(`${board}: ${result.inlined} image references embedded`);
	}

	const system = copyWithImages(SYSTEM_BOARD, path.join(OUT_DIR, "system.html"));
	totalInlined += system.inlined;
	allMissing.push(...system.missing);
	console.log(`system.html: ${system.inlined} image references embedded`);

	const manifest = JSON.parse(readFileSync(path.join(SOURCE_DIR, "design.json"), "utf8")) as Record<
		string,
		unknown
	>;
	const previewManifest = {
		...manifest,
		title: `${manifest["title"] as string} (with product photography)`,
		brief: `${manifest["brief"] as string} This variant embeds the real local product photos as data URIs for canvas review only; it is gitignored and is not the tracked source.`,
	};
	writeFileSync(
		path.join(OUT_DIR, "design.json"),
		`${JSON.stringify(previewManifest, null, "\t")}\n`,
		"utf8",
	);

	const uniqueMissing = [...new Set(allMissing)];
	console.log(`\nembedded ${totalInlined} references into ${path.relative(ROOT, OUT_DIR)}`);
	if (uniqueMissing.length > 0) {
		console.warn(`could not resolve ${uniqueMissing.length} reference(s):`);
		for (const reference of uniqueMissing) console.warn(`  ${reference}`);
		process.exitCode = 1;
	}
}

main();
