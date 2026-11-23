import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { INVALID_CREDENTIALS, NO_OTHER_ACCOUNTS } from "./copy";
import { LoginFields } from "./login-fields";

const signIn = () => undefined;

const fields = (error: string | null) =>
	renderToStaticMarkup(
		<LoginFields action={signIn} error={error} next="/admin" />,
	);

describe("the sign-in form", () => {
	it("shows no failure while nothing has failed", () => {
		const markup = fields(null);

		expect(markup).not.toContain('role="alert"');
		expect(markup).not.toContain("aria-invalid");
		expect(markup).not.toContain(NO_OTHER_ACCOUNTS);
	});

	it("marks both fields invalid and explains the failure", () => {
		const markup = fields(INVALID_CREDENTIALS);

		expect(markup).toContain(INVALID_CREDENTIALS);
		expect(markup).toContain(NO_OTHER_ACCOUNTS);
		expect(markup.match(/aria-invalid="true"/g)).toHaveLength(2);
		expect(markup).toContain('role="alert"');
	});

	it("paints the failure with the danger token, not a neutral one", () => {
		const css = readFileSync(new URL("./login.module.css", import.meta.url), "utf8");

		expect(css).toMatch(/\.error\s*\{[^}]*color:\s*var\(--danger\)/);
	});

	it("carries the validated next path as a hidden field", () => {
		expect(fields(null)).toContain('name="next" value="/admin"');
	});
});
