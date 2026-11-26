import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../../..", import.meta.url));
const SELF = fileURLToPath(import.meta.url);

function sources(): string[] {
	return readdirSync(SRC, { recursive: true })
		.map((entry) => join(SRC, String(entry)))
		.filter(
			(path) =>
				path !== SELF &&
				(path.endsWith(".ts") || path.endsWith(".tsx")),
		);
}

describe("the browser product store the panel left behind", () => {
	it("no longer exists as a module or as a test", () => {
		expect(existsSync(join(SRC, "features/admin/storage/product-store.ts"))).toBe(false);
		expect(existsSync(join(SRC, "features/admin/storage/product-store.test.ts"))).toBe(
			false,
		);
		expect(existsSync(join(SRC, "features/admin/storage/product-storage.ts"))).toBe(false);
		expect(existsSync(join(SRC, "features/admin/storage/product-storage.test.ts"))).toBe(
			false,
		);
	});

	it("has no importer left anywhere in src", () => {
		const forbidden = [
			"storage/product-store",
			"storage/product-storage",
			"commitProducts",
			"getProductsSnapshot",
			"getProductsServerSnapshot",
			"subscribeProducts",
			"itech-store.admin-products.v1",
		];

		for (const path of sources()) {
			const content = readFileSync(path, "utf8");

			for (const token of forbidden) {
				expect(content, `${path} still mentions ${token}`).not.toContain(token);
			}
		}
	});
});
