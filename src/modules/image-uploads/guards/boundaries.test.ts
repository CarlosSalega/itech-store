import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const GUARDS_DIR = path.dirname(fileURLToPath(import.meta.url));

const sources = readdirSync(GUARDS_DIR)
	.filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
	.sort();

function source(file: string): string {
	return readFileSync(path.join(GUARDS_DIR, file), "utf8");
}

function importsOf(file: string): string[] {
	return [...source(file).matchAll(/(?:from|import)\s*["']([^"']+)["']/g)].map((match) => match[1]);
}

describe("the guards boundary", () => {
	it("finds its own sources, so the sweep cannot pass vacuously", () => {
		expect(sources.length).toBeGreaterThanOrEqual(4);
		expect(sources).toContain("index.ts");
	});

	it("imports nothing but its own files and the core it builds on", () => {
		const offenders = sources.filter((file) =>
			importsOf(file).some(
				(specifier) => !specifier.startsWith("./") && !specifier.startsWith("../core/"),
			),
		);

		expect(offenders).toEqual([]);
	});

	it("reads no environment, touches no transport and reaches no database", () => {
		const offenders = sources.filter((file) =>
			/process\.|next\/|node:|prisma/i.test(source(file)),
		);

		expect(offenders).toEqual([]);
	});

	it("exposes every module through the index", () => {
		const index = source("index.ts");
		const exposed = [...index.matchAll(/export \* from "\.\/(.+?)";/g)]
			.map((match) => `${match[1]}.ts`)
			.sort();

		expect(exposed).toEqual(sources.filter((file) => file !== "index.ts"));
	});
});
