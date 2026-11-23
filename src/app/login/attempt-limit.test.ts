import { beforeEach, describe, expect, it } from "vitest";

import {
	LOGIN_LIMITS,
	allowLoginAttempt,
	clearLoginAttempts,
	decideAttempt,
	loginAttemptKey,
	resetLoginAttempts,
	type AttemptState,
} from "./attempt-limit";

const LIMITS = { windowMs: 60_000, max: 3 };
const KEY = "admin@example.com";

describe("the attempt decision", () => {
	it("opens a window with the first attempt", () => {
		expect(decideAttempt(undefined, 1_000, LIMITS)).toEqual({
			allowed: true,
			state: { count: 1, expiresAt: 61_000 },
		});
	});

	it("counts attempts inside the window without moving its end", () => {
		const opened = decideAttempt(undefined, 1_000, LIMITS).state;

		expect(decideAttempt(opened, 30_000, LIMITS)).toEqual({
			allowed: true,
			state: { count: 2, expiresAt: 61_000 },
		});
	});

	it("refuses the attempt after the maximum and leaves the window alone", () => {
		const full: AttemptState = { count: 3, expiresAt: 61_000 };

		expect(decideAttempt(full, 30_000, LIMITS)).toEqual({
			allowed: false,
			state: full,
		});
	});

	it("refuses one millisecond before the window ends", () => {
		expect(
			decideAttempt({ count: 3, expiresAt: 61_000 }, 60_999, LIMITS).allowed,
		).toBe(false);
	});

	it("opens a fresh window once the previous one expired", () => {
		expect(
			decideAttempt({ count: 3, expiresAt: 61_000 }, 61_000, LIMITS),
		).toEqual({ allowed: true, state: { count: 1, expiresAt: 121_000 } });
	});
});

describe("the attempt key", () => {
	it.each([
		"admin@example.com",
		" Admin@Example.com ",
		"ADMIN@EXAMPLE.COM\t",
	])("collapses %j into one counter", (email) => {
		expect(loginAttemptKey(email)).toBe(KEY);
	});
});

describe("the attempt store", () => {
	beforeEach(() => resetLoginAttempts());

	it("lets the configured number of attempts through and refuses the next one", () => {
		const answers = Array.from({ length: LOGIN_LIMITS.max + 1 }, (_, index) =>
			allowLoginAttempt(KEY, 1_000 + index),
		);

		expect(answers).toEqual([
			...Array.from({ length: LOGIN_LIMITS.max }, () => true),
			false,
		]);
	});

	it("counts every spelling of the same address against one window", () => {
		for (let attempt = 0; attempt < LOGIN_LIMITS.max; attempt += 1) {
			allowLoginAttempt(loginAttemptKey(" Admin@Example.com "), 1_000 + attempt);
		}

		expect(allowLoginAttempt(KEY, 2_000)).toBe(false);
	});

	it("keeps two addresses apart", () => {
		for (let attempt = 0; attempt < LOGIN_LIMITS.max; attempt += 1) {
			allowLoginAttempt(KEY, 1_000 + attempt);
		}

		expect(allowLoginAttempt("otra@example.com", 2_000)).toBe(true);
	});

	it("lets the same address in again once the window expires", () => {
		for (let attempt = 0; attempt < LOGIN_LIMITS.max; attempt += 1) {
			allowLoginAttempt(KEY, 1_000);
		}

		expect(allowLoginAttempt(KEY, 1_000 + LOGIN_LIMITS.windowMs)).toBe(true);
	});

	it("forgets a key when it is cleared", () => {
		for (let attempt = 0; attempt < LOGIN_LIMITS.max; attempt += 1) {
			allowLoginAttempt(KEY, 1_000);
		}

		expect(allowLoginAttempt(KEY, 1_500)).toBe(false);

		clearLoginAttempts(KEY);

		expect(allowLoginAttempt(KEY, 1_500)).toBe(true);
	});
});
