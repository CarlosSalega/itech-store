import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A structural check, not a pixel one: the design directions animate on purpose,
 * and the requirement is that a visitor who asks for reduced motion gets the
 * finished state instead of a hidden one. The global guard is what guarantees
 * that, so it is pinned here rather than left to a comment.
 */
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
