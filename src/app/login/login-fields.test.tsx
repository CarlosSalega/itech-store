import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { INVALID_CREDENTIALS, INVALID_EMAIL } from "./copy";
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
		expect(markup).not.toContain("seed");
	});

	it("points the email field at the store's own address, not an invented person", () => {
		const markup = fields(null);

		expect(markup).toContain('placeholder="ejemplo@itechstore.com"');
	});

	it("marks both fields invalid and explains the failure", () => {
		const markup = fields(INVALID_CREDENTIALS);

		expect(markup).toContain(INVALID_CREDENTIALS);
		expect(markup).not.toContain("seed");
		expect(markup.match(/aria-invalid="true"/g)).toHaveLength(2);
		expect(markup).toContain('role="alert"');
	});

	it("keeps the summary lane for the refusal alone, in one caption line", () => {
		const markup = fields(INVALID_CREDENTIALS);
		const alert = /<p[^>]*role="alert"[^>]*>([^<]*)<\/p>/.exec(markup);
		const css = readFileSync(new URL("./login.module.css", import.meta.url), "utf8");

		expect(alert?.[1]).toBe(INVALID_CREDENTIALS);
		expect(css).toMatch(/\.error\s*\{[^}]*font-size:\s*var\(--t-caption\)/);
		expect(css).toMatch(/\.error\s*\{[^}]*line-height:\s*1\.35/);
		expect(css).not.toMatch(/\.failureNote/);
	});

	it("paints the failure with the danger token, not a neutral one", () => {
		const css = readFileSync(new URL("./login.module.css", import.meta.url), "utf8");

		expect(css).toMatch(/\.error\s*\{[^}]*color:\s*var\(--danger\)/);
	});

	it("carries the validated next path as a hidden field", () => {
		expect(fields(null)).toContain('name="next" value="/admin"');
	});
});

describe("the room the login reserves for its messages", () => {
	it("keeps one announced slot under each field before anything fails", () => {
		const markup = fields(null);

		expect(markup.match(/aria-live="polite"/g)).toHaveLength(2);
		expect(markup).not.toContain("seed");
		expect(markup).toContain('aria-describedby="login-email-message"');
		expect(markup).toContain('aria-describedby="login-password-message"');
		expect(markup).toContain('id="login-email-message"');
		expect(markup).toContain('id="login-password-message"');
	});

	it("reserves a caption line for the slot instead of revealing it", () => {
		const css = readFileSync(new URL("./login.module.css", import.meta.url), "utf8");
		const source = readFileSync(new URL("./login-fields.tsx", import.meta.url), "utf8");
		const line = /min-height:\s*calc\(var\(--t-caption\)\s*\*\s*1\.35\s*\+\s*var\(--s-1\)\)/;

		expect(css).toMatch(new RegExp(`\\.slot\\s*\\{[^}]*${line.source}`));
		expect(css).toMatch(new RegExp(`\\.summary\\s*\\{[^}]*${line.source}`));
		expect(source).toContain("styles.slot");
		expect(source).toContain("styles.summary");
	});

	it("writes a payload message in its own slot and marks only that field", () => {
		const markup = renderToStaticMarkup(
			<LoginFields action={signIn} error={null} messages={{ email: INVALID_EMAIL }} next="/admin" />,
		);

		expect(markup).toContain(INVALID_EMAIL);
		expect(markup.match(/aria-invalid="true"/g)).toHaveLength(1);
		expect(markup).not.toContain('role="alert"');
	});
});
