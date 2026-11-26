import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const PROVIDER_DIR = path.dirname(fileURLToPath(import.meta.url));

const sources = readdirSync(PROVIDER_DIR)
	.filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
	.sort();

function source(file: string): string {
	return readFileSync(path.join(PROVIDER_DIR, file), "utf8");
}

describe("the provider boundary", () => {
	it("finds its own sources, so the sweep cannot pass vacuously", () => {
		expect(sources.length).toBeGreaterThanOrEqual(2);
		expect(sources).toContain("index.ts");
	});

	it("reads no environment and touches no transport", () => {
		const offenders = sources.filter((file) => /process\.|next\//.test(source(file)));

		expect(offenders).toEqual([]);
	});

	it("exposes every module through the index", () => {
		const exposed = [...source("index.ts").matchAll(/export \* from "\.\/(.+?)";/g)]
			.map((match) => `${match[1]}.ts`)
			.sort();

		expect(exposed).toEqual(sources.filter((file) => file !== "index.ts"));
	});
});
