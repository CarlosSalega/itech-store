import { APIError } from "better-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { INVALID_CREDENTIALS, INVALID_EMAIL, MISSING_PASSWORD } from "./copy";
import { LOGIN_LIMITS, resetLoginAttempts } from "./attempt-limit";
import { signIn, type SignInState } from "./actions";

const mocks = vi.hoisted(() => ({
	redirect: vi.fn(),
	signInEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
	getAuth: () => ({ api: { signInEmail: mocks.signInEmail } }),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const EMPTY: SignInState = { error: null };

function form(fields: Record<string, string>): FormData {
	const data = new FormData();

	for (const [name, value] of Object.entries(fields)) data.set(name, value);

	return data;
}

function failure(code: string, message: string): APIError {
	return APIError.from("UNAUTHORIZED", { code, message });
}

beforeEach(() => {
	mocks.redirect.mockReset();
	mocks.signInEmail.mockReset();
	resetLoginAttempts();
});

describe("the sign-in action", () => {
	it("answers a wrong password and an unknown email with the same words", async () => {
		mocks.signInEmail.mockRejectedValueOnce(
			failure("INVALID_EMAIL_OR_PASSWORD", "Invalid email or password"),
		);
		const wrongPassword = await signIn(
			EMPTY,
			form({ email: "admin@example.com", password: "one-password", next: "/admin" }),
		);

		mocks.signInEmail.mockRejectedValueOnce(
			failure("INVALID_EMAIL_OR_PASSWORD", "Invalid email or password"),
		);
		const unknownEmail = await signIn(
			EMPTY,
			form({ email: "nobody@example.com", password: "other-password", next: "/admin" }),
		);

		expect(wrongPassword).toEqual({ error: INVALID_CREDENTIALS });
		expect(unknownEmail).toEqual(wrongPassword);
		expect(mocks.redirect).not.toHaveBeenCalled();
	});

	it("does not disguise a failure that is not a refused credential", async () => {
		const broken = new Error("database is unreachable");
		mocks.signInEmail.mockRejectedValueOnce(broken);

		await expect(
			signIn(EMPTY, form({ email: "admin@example.com", password: "a-password", next: "/admin" })),
		).rejects.toThrow(broken);
	});

	it("redirects to the validated next path after signing in", async () => {
		mocks.signInEmail.mockResolvedValueOnce({ user: { id: "user_1" } });

		await signIn(
			EMPTY,
			form({
				email: " admin@example.com ",
				password: "a-password",
				next: "/admin/pedidos?estado=nuevo",
			}),
		);

		expect(mocks.signInEmail).toHaveBeenCalledWith({
			body: { email: "admin@example.com", password: "a-password" },
			headers: expect.any(Headers),
		});
		expect(mocks.redirect).toHaveBeenCalledWith("/admin/pedidos?estado=nuevo");
	});

	it("falls back to the panel when next points somewhere else", async () => {
		mocks.signInEmail.mockResolvedValueOnce({ user: { id: "user_1" } });

		await signIn(
			EMPTY,
			form({
				email: "admin@example.com",
				password: "a-password",
				next: "https://evil.example/admin",
			}),
		);

		expect(mocks.redirect).toHaveBeenCalledWith("/admin");
	});
});

describe("the payload the sign-in action accepts", () => {
	it("answers a rejected payload with our field copy instead of the credential sentence", async () => {
		const answer = await signIn(
			EMPTY,
			form({ email: "no-es-un-email", password: "", next: "/admin" }),
		);

		expect(answer).toEqual({
			error: null,
			messages: { email: INVALID_EMAIL, password: MISSING_PASSWORD },
		});
		expect(mocks.signInEmail).not.toHaveBeenCalled();
	});

	it("reads the payload the same way the form does", async () => {
		mocks.signInEmail.mockResolvedValueOnce({ user: { id: "user_1" } });

		await signIn(
			EMPTY,
			form({ email: "  admin@example.com ", password: " a-password ", next: "/admin" }),
		);

		expect(mocks.signInEmail).toHaveBeenCalledWith({
			body: { email: "admin@example.com", password: " a-password " },
			headers: expect.any(Headers),
		});
	});

	it("keeps counting a rejected payload against the same window", async () => {
		const attempt = () => signIn(EMPTY, form({ email: "", password: "", next: "/admin" }));

		for (let index = 0; index < LOGIN_LIMITS.max; index += 1) {
			await attempt();
		}

		expect(await attempt()).toEqual({ error: INVALID_CREDENTIALS });
		expect(mocks.signInEmail).not.toHaveBeenCalled();
	});
});

describe("the attempt limit on the sign-in action", () => {
	const refusal = () =>
		failure("INVALID_EMAIL_OR_PASSWORD", "Invalid email or password");

	function attempt(email: string): Promise<SignInState> {
		return signIn(
			EMPTY,
			form({ email, password: "a-wrong-password", next: "/admin" }),
		);
	}

	it("stops asking the library once the window is full, with the same sentence", async () => {
		mocks.signInEmail.mockRejectedValue(refusal());

		const answers: SignInState[] = [];
		for (let index = 0; index <= LOGIN_LIMITS.max; index += 1) {
			answers.push(await attempt("admin@example.com"));
		}

		expect(mocks.signInEmail).toHaveBeenCalledTimes(LOGIN_LIMITS.max);
		expect(answers).toEqual(
			Array.from({ length: LOGIN_LIMITS.max + 1 }, () => ({
				error: INVALID_CREDENTIALS,
			})),
		);
		expect(mocks.redirect).not.toHaveBeenCalled();
	});

	it("counts another spelling of the same address against that window", async () => {
		mocks.signInEmail.mockRejectedValue(refusal());

		for (let index = 0; index < LOGIN_LIMITS.max; index += 1) {
			await attempt(" Admin@Example.com ");
		}

		mocks.signInEmail.mockClear();

		expect(await attempt("admin@example.com")).toEqual({
			error: INVALID_CREDENTIALS,
		});
		expect(mocks.signInEmail).not.toHaveBeenCalled();
	});

	it("gives the admin a fresh window after a correct password", async () => {
		mocks.signInEmail.mockRejectedValue(refusal());

		for (let index = 0; index < LOGIN_LIMITS.max - 1; index += 1) {
			await attempt("admin@example.com");
		}

		mocks.signInEmail.mockResolvedValueOnce({ user: { id: "user_1" } });
		await signIn(
			EMPTY,
			form({
				email: "admin@example.com",
				password: "a-password",
				next: "/admin",
			}),
		);

		mocks.signInEmail.mockClear();
		mocks.signInEmail.mockRejectedValue(refusal());

		for (let index = 0; index < LOGIN_LIMITS.max; index += 1) {
			await attempt("admin@example.com");
		}

		expect(mocks.signInEmail).toHaveBeenCalledTimes(LOGIN_LIMITS.max);
	});
});
