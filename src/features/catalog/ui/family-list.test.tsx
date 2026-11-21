import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FamilyList } from "./family-list";

const html = renderToStaticMarkup(
	<FamilyList
		families={[
			{ category: "MAC", count: 27 },
			{ category: "WATCH", count: 0 },
		]}
	/>,
);
const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? [];

describe("FamilyList with an empty family", () => {
	it("keeps the entry with its zero count and the sentence", () => {
		expect(html).toContain("Watch");
		expect(html).toContain("0 productos");
		expect(html).toContain("¿Buscás algo que no está?");
	});

	it("does not link the empty family's name; only Consultanos links, to /contacto", () => {
		expect(anchors.filter((anchor) => anchor.includes("Watch"))).toEqual([]);
		expect(anchors.filter((anchor) => anchor.includes("Consultanos"))).toEqual([
			expect.stringContaining('href="/contacto"'),
		]);
		expect(anchors).toHaveLength(2);
	});

	it("keeps a filled family as a link to /catalogo", () => {
		expect(anchors.filter((anchor) => anchor.includes("Mac"))).toEqual([
			expect.stringContaining('href="/catalogo"'),
		]);
	});

	it("reduced motion also neutralises the empty link's chevron", () => {
		const css = readFileSync(
			path.join(process.cwd(), "src", "features", "catalog", "ui", "family-list.module.css"),
			"utf8",
		);
		const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

		expect(reduced).toMatch(/\.emptyLink:hover \.chevron/);
	});
});
