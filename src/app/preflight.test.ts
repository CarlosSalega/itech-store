import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const appDir = path.join(process.cwd(), "src", "app");
const preflight = readFileSync(path.join(appDir, "preflight.css"), "utf8");
const globals = readFileSync(path.join(appDir, "globals.css"), "utf8");

function declarationBlock(selector: RegExp): string {
	const match = selector.exec(preflight);
	if (match === null) return "";
	const open = preflight.indexOf("{", match.index);
	const close = preflight.indexOf("}", open);
	return preflight.slice(open + 1, close);
}

const hostBlock = declarationBlock(/^html,\n:host \{/m);
const monoBlock = declarationBlock(/^code,\nkbd,\nsamp,\npre \{/m);

describe("vendored preflight reset", () => {
	it("is imported by globals.css before any rule", () => {
		expect(globals.startsWith('@import "./preflight.css";')).toBe(true);
	});

	it("carries no unresolved --theme() call, which only Tailwind's compiler could resolve", () => {
		expect(preflight).not.toContain("--theme(");
	});

	it("takes the page font from this project's sans token", () => {
		expect(hostBlock).toContain("font-family: var(--font-sans);");
		expect(hostBlock).toContain("font-feature-settings: normal;");
		expect(hostBlock).toContain("font-variation-settings: normal;");
	});

	it("takes the monospace font from this project's mono token", () => {
		expect(monoBlock).toContain("font-family: var(--font-mono);");
		expect(monoBlock).toContain("font-feature-settings: normal;");
		expect(monoBlock).toContain("font-variation-settings: normal;");
	});

	it("reads only custom properties that globals.css declares", () => {
		const referenced = [...preflight.matchAll(/var\((--[a-z0-9-]+)\)/gi)].map((match) => match[1]);
		expect(referenced.length).toBeGreaterThan(0);
		for (const token of referenced) {
			expect(globals).toContain(`${token}:`);
		}
	});
});
