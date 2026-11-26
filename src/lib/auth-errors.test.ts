import { APIError } from "better-auth";
import { describe, expect, it } from "vitest";

import { alreadyRegistered } from "./auth-errors";

function apiError(code: string): APIError {
	return new APIError(422, {
		code,
		message: "User already exists. Use another email.",
	});
}

describe("alreadyRegistered", () => {
	it("recognises the code Better Auth actually sends", () => {
		expect(alreadyRegistered(apiError("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"))).toBe(
			true,
		);
	});

	it("keeps recognising the bare code", () => {
		expect(alreadyRegistered(apiError("USER_ALREADY_EXISTS"))).toBe(true);
	});

	it("does not swallow another API failure", () => {
		expect(alreadyRegistered(apiError("INVALID_EMAIL"))).toBe(false);
	});

	it("does not swallow a plain error", () => {
		expect(alreadyRegistered(new Error("boom"))).toBe(false);
	});
});
