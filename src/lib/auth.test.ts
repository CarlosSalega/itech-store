import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "http://localhost:3000";
const SECRET = "conformance-check-secret-0123456789abcdef";
const DATABASE_URL = "postgresql://audit:audit@127.0.0.1:5432/conformance_only";

function configure(extra: Record<string, string> = {}): void {
	Object.assign(process.env, {
		BETTER_AUTH_SECRET: SECRET,
		BETTER_AUTH_URL: ORIGIN,
		DATABASE_URL,
		...extra,
	});
}

async function instance(extra: Record<string, string> = {}) {
	vi.resetModules();
	configure(extra);

	const loaded = await import("./auth");

	return loaded.getAuth();
}

type CallOptions = {
	method?: string;
	origin?: string;
	body?: unknown;
};

function call(path: string, options: CallOptions = {}): Request {
	const headers: Record<string, string> = {};

	if (options.origin !== undefined) headers["origin"] = options.origin;
	if (options.body !== undefined) headers["content-type"] = "application/json";

	return new Request(`${ORIGIN}/api/auth${path}`, {
		method: options.method ?? "GET",
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
	});
}

async function body(response: Response): Promise<Record<string, unknown>> {
	return (await response.json()) as Record<string, unknown>;
}

afterEach(() => {
	delete process.env.BETTER_AUTH_TRUSTED_ORIGINS;
});

describe("the auth instance", () => {
	it("is built once per process", async () => {
		vi.resetModules();
		configure();

		const loaded = await import("./auth");

		expect(loaded.getAuth()).toBe(loaded.getAuth());
	});

	it("keeps the Next.js cookie plugin, which has to run last, in last place", async () => {
		const auth = await instance();
		const plugins = (auth.options.plugins ?? []).map((plugin) => plugin.id);

		expect(plugins).toEqual(["next-cookies", "magic-link"]);
	});

	it("names the missing secret instead of signing sessions with something invented", async () => {
		vi.resetModules();
		configure();
		delete process.env.BETTER_AUTH_SECRET;

		const loaded = await import("./auth");

		expect(() => loaded.getAuth()).toThrow(/BETTER_AUTH_SECRET is not set/);
	});

	it("never accepts a role from the client, so sign-up cannot ask for ADMIN", async () => {
		const auth = await instance();

		expect(auth.options.user?.additionalFields?.["role"]).toMatchObject({
			defaultValue: "CUSTOMER",
			input: false,
			type: "string",
		});
	});
});

describe("the mounted auth endpoints", () => {
	it("answers the health check the integration guide asks for", async () => {
		const auth = await instance();
		const response = await auth.handler(call("/ok"));

		expect(response.status).toBe(200);
		expect(await body(response)).toEqual({ ok: true });
	});

	it("trusts the app origin and the extra origins the environment adds", async () => {
		const auth = await instance({
			BETTER_AUTH_TRUSTED_ORIGINS: "https://panel.example",
		});

		expect((await auth.$context).trustedOrigins).toEqual([
			ORIGIN,
			"https://panel.example",
		]);
	});

	it("adds no password rules and no hasher of its own", async () => {
		const auth = await instance();

		expect(auth.options.emailAndPassword).toEqual({ enabled: true });
	});

	it("refuses a password reset because this phase has no email provider", async () => {
		const auth = await instance();
		const response = await auth.handler(
			call("/request-password-reset", {
				method: "POST",
				body: { email: "admin@example.com" },
			}),
		);

		expect(response.status).toBe(400);
		expect(await body(response)).toMatchObject({
			code: "RESET_PASSWORD_DISABLED",
		});
	});

	it("refuses a verification email because this phase has no email provider", async () => {
		const auth = await instance();
		const response = await auth.handler(
			call("/send-verification-email", {
				method: "POST",
				body: { email: "admin@example.com" },
			}),
		);

		expect(response.status).toBe(400);
		expect(await body(response)).toMatchObject({
			code: "VERIFICATION_EMAIL_NOT_ENABLED",
		});
	});

	it("closes self-registration and closes nothing else", async () => {
		const auth = await instance();

		expect(auth.options.disabledPaths).toEqual(["/sign-up/email"]);
	});

	it("answers 404 on sign-up over HTTP, so no visitor can create an account", async () => {
		const auth = await instance();
		const response = await auth.handler(
			call("/sign-up/email", {
				method: "POST",
				origin: ORIGIN,
				body: {
					name: "Intruso",
					email: "intruso@example.com",
					password: "a-long-enough-password",
				},
			}),
		);

		expect(response.status).toBe(404);
	});

	it("keeps the seed's internal sign-up working, with the library's password rule", async () => {
		const auth = await instance();

		await expect(
			auth.api.signUpEmail({
				body: {
					name: "Administrador",
					email: "admin@example.com",
					password: "short",
				},
			}),
		).rejects.toMatchObject({ body: { code: "PASSWORD_TOO_SHORT" } });
	});

	it("expires the session cookie on sign-out, which is what the panel's action relies on", async () => {
		const auth = await instance();
		const response = await auth.handler(
			new Request(`${ORIGIN}/api/auth/sign-out`, {
				method: "POST",
				headers: {
					origin: ORIGIN,
					cookie: "better-auth.session_token=stale-session-token",
				},
			}),
		);
		const cookies = response.headers.getSetCookie().join("; ");

		expect(response.status).toBe(200);
		expect(cookies).toMatch(/session_token=;/);
		expect(cookies).toMatch(/Max-Age=0/i);
	});
});
