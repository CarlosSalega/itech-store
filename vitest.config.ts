import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.{ts,tsx}"],
		// Feature tests arrive with the catalog (T9); this keeps `pnpm test`
		// meaningful before them instead of failing with "no test files".
		passWithNoTests: true,
	},
});
