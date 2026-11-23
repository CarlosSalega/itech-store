import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NO_OTHER_ACCOUNTS, NO_PASSWORD_RESET } from "./copy";
import { LoginNotes } from "./login-notes";

describe("the login's standing notes", () => {
	it("keeps both facts on the page, byte for byte", () => {
		const markup = renderToStaticMarkup(<LoginNotes />);

		expect(markup).toContain(NO_OTHER_ACCOUNTS);
		expect(markup).toContain(NO_PASSWORD_RESET);
		expect(markup.match(/<p/g)).toHaveLength(2);
	});

	it("keeps every note out of the announced lanes", () => {
		const markup = renderToStaticMarkup(<LoginNotes />);

		expect(markup).not.toContain("aria-live");
		expect(markup).not.toContain("role=");
		expect(markup).not.toContain("aria-describedby");
	});

	it("hangs the notes under the form, always, from the page", () => {
		const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

		expect(source).toContain("<LoginNotes />");
		expect(source).not.toContain("NO_PASSWORD_RESET");
	});
});
