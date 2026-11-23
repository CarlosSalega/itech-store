import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	headers: vi.fn(),
	redirect: vi.fn(),
	signOut: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
	getAuth: () => ({ api: { signOut: mocks.signOut } }),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { signOut } from "./actions";

const REQUEST_HEADERS = new Headers({
	cookie: "better-auth.session_token=session-from-the-browser",
});

beforeEach(() => {
	mocks.headers.mockReset().mockResolvedValue(REQUEST_HEADERS);
	mocks.signOut.mockReset().mockResolvedValue({ success: true });
	mocks.redirect
		.mockReset()
		.mockImplementation(() => {
			throw new Error("NEXT_REDIRECT");
		});
});

describe("the sign-out action", () => {
	it("lands the request on the login screen", async () => {
		await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

		expect(mocks.redirect).toHaveBeenCalledWith("/login");
	});

	it("clears the session through the library, with the request that carries the cookie", async () => {
		await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

		expect(mocks.signOut).toHaveBeenCalledWith({ headers: REQUEST_HEADERS });
		expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.redirect.mock.invocationCallOrder[0] ?? 0,
		);
	});

	it("does not pretend the session ended when the library refuses to clear it", async () => {
		const broken = new Error("session store is unreachable");
		mocks.signOut.mockRejectedValueOnce(broken);

		await expect(signOut()).rejects.toThrow(broken);

		expect(mocks.redirect).not.toHaveBeenCalled();
	});
});
