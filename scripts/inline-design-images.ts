import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SYSTEM_BOARD = path.join(ROOT, "design", "system.html");

const SLUGS = (() => {
	const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));

	return requested.length > 0 ? requested : ["storefront"];
})();

const SOURCE_ATTRIBUTE = /\bsrc="([^"]+)"/g;

const IMAGE_FILE = /\.(?:webp|png|jpe?g|svg)$/i;

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

	const output = html.replace(SOURCE_ATTRIBUTE, (whole, reference: string) => {
		if (!IMAGE_FILE.test(reference)) return whole;

		const cached = cache.get(reference);
		if (cached) {
			inlined += 1;

			return `src="${cached}"`;
		}

		const file = resolveToFile(reference);
		if (!file) {
			if (!missing.includes(reference)) missing.push(reference);

			return whole;
		}

		const uri = dataUri(file);
		cache.set(reference, uri);
		inlined += 1;

		return `src="${uri}"`;
	});

	return { html: output, inlined, missing };
}

function assertFullyInlined(html: string, outputFile: string): void {
	const leftover: string[] = [];

	for (const match of html.matchAll(SOURCE_ATTRIBUTE)) {
		const reference = match[1];

		if (!reference.startsWith("data:") && IMAGE_FILE.test(reference)) leftover.push(reference);
	}

	if (leftover.length > 0) {
		throw new Error(
			`${path.basename(outputFile)} still references ${leftover.length} file(s), e.g. ${leftover[0]}`,
		);
	}
}

function copyWithImages(sourceFile: string, outputFile: string): Inline {
	const { html, inlined, missing } = inlineImages(readFileSync(sourceFile, "utf8"));

	assertFullyInlined(html, outputFile);

	mkdirSync(path.dirname(outputFile), { recursive: true });
	writeFileSync(outputFile, html, "utf8");

	return { html, inlined, missing };
}

function writePreviewManifest(sourceDir: string, outDir: string): void {
	const manifest = JSON.parse(
		readFileSync(path.join(sourceDir, "design.json"), "utf8"),
	) as Record<string, unknown>;
	const previewManifest = {
		...manifest,
		title: `${manifest["title"] as string} (with product photography)`,
		brief: `${manifest["brief"] as string} This variant embeds the real local product photos as data URIs for canvas review only; it is gitignored and is not the tracked source.`,
	};

	writeFileSync(
		path.join(outDir, "design.json"),
		`${JSON.stringify(previewManifest, null, "\t")}\n`,
		"utf8",
	);
}

function main(): void {
	let totalInlined = 0;
	const allMissing: string[] = [];

	for (const slug of SLUGS) {
		const sourceDir = path.join(ROOT, "design", slug);
		const outDir = path.join(ROOT, "design", `${slug}-photos`);

		if (!existsSync(sourceDir)) throw new Error(`design/${slug} does not exist`);
		mkdirSync(outDir, { recursive: true });

		const boards = readdirSync(sourceDir).filter((file) => file.endsWith(".html"));
		if (boards.length === 0) throw new Error(`no artboards found to inline in design/${slug}`);

		for (const board of boards) {
			const result = copyWithImages(path.join(sourceDir, board), path.join(outDir, board));
			totalInlined += result.inlined;
			allMissing.push(...result.missing);
			console.log(`${slug}/${board}: ${result.inlined} image references embedded`);
		}

		const system = copyWithImages(SYSTEM_BOARD, path.join(outDir, "system.html"));
		totalInlined += system.inlined;
		allMissing.push(...system.missing);
		console.log(`${slug}/system.html: ${system.inlined} image references embedded`);

		writePreviewManifest(sourceDir, outDir);
	}

	const uniqueMissing = [...new Set(allMissing)];
	console.log(`\nembedded ${totalInlined} references into design/*-photos`);
	if (uniqueMissing.length > 0) {
		console.warn(`could not resolve ${uniqueMissing.length} reference(s):`);
		for (const reference of uniqueMissing) console.warn(`  ${reference}`);
		process.exitCode = 1;
	}
}

main();
