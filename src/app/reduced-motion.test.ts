import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const globals = readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf8");

describe("reduced motion guard", () => {
	it("targets the reduced-motion media query", () => {
		expect(globals).toContain("prefers-reduced-motion: reduce");
	});

	it("neutralises animations and transitions, leaving the finished state", () => {
		expect(globals).toMatch(/animation:\s*none\s*!important/);
		expect(globals).toMatch(/transition-duration:\s*0ms\s*!important/);
	});
});
