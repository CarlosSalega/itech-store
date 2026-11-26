import { describe, expect, it } from "vitest";

import {
	describeError,
	ImageError,
	IMAGE_ERROR_STATUS,
	isImageError,
	statusForImageError,
} from "./index";
import type { ImageErrorCode } from "./index";

describe("statusForImageError", () => {
	it("maps each code to its HTTP status", () => {
		expect(statusForImageError("UNAUTHENTICATED")).toBe(401);
		expect(statusForImageError("FORBIDDEN")).toBe(403);
		expect(statusForImageError("NO_FILE")).toBe(400);
		expect(statusForImageError("INVALID_TYPE")).toBe(400);
		expect(statusForImageError("TOO_LARGE")).toBe(413);
		expect(statusForImageError("MISSING_KEY")).toBe(400);
		expect(statusForImageError("PATH_MISSING")).toBe(400);
		expect(statusForImageError("NOT_FOUND")).toBe(404);
		expect(statusForImageError("PROVIDER_UNKNOWN")).toBe(500);
		expect(statusForImageError("MISCONFIGURED")).toBe(500);
		expect(statusForImageError("UPLOAD_FAILED")).toBe(500);
		expect(statusForImageError("DELETE_FAILED")).toBe(500);
		expect(statusForImageError("UPSTREAM_FAILED")).toBe(500);
		expect(statusForImageError("TIMEOUT")).toBe(504);
	});
});

describe("ImageError", () => {
	it("carries the code, the derived status and the details", () => {
		const error = new ImageError("TOO_LARGE", { details: { size: 20 } });

		expect(error.code).toBe("TOO_LARGE");
		expect(error.status).toBe(413);
		expect(error.details).toEqual({ size: 20 });
		expect(isImageError(error)).toBe(true);
		expect(isImageError(new Error("nope"))).toBe(false);
	});

	it("carries the code instead of a sentence until the mapper runs", () => {
		const error = new ImageError("INVALID_TYPE");

		expect(error.message).toBe("INVALID_TYPE");
		expect(error.name).toBe("ImageError");
		expect(error).toBeInstanceOf(Error);
	});

	it("keeps the cause it was given", () => {
		const cause = new Error("socket hang up");
		const error = new ImageError("UPLOAD_FAILED", { cause });

		expect(error.cause).toBe(cause);
		expect(error.message).toBe("UPLOAD_FAILED");
	});

	it("has no details when none were given", () => {
		expect(new ImageError("NOT_FOUND").details).toBeUndefined();
	});
});

describe("describeError", () => {
	it("never throws on hostile values", () => {
		const circular: Record<string, unknown> = {};
		circular["self"] = circular;

		expect(describeError(new Error("boom"))).toBe("boom");
		expect(describeError("plain")).toBe("plain");
		expect(describeError(circular)).toBe("[object Object]");
		expect(describeError(null)).toBe("null");
	});

	it("describes a DOMException with its name and message", () => {
		expect(describeError(new DOMException("The operation was aborted.", "TimeoutError"))).toBe(
			"TimeoutError: The operation was aborted.",
		);
	});

	it("describes a named failure it did not create", () => {
		expect(describeError({ name: "Error", message: "ETIMEDOUT" })).toBe("Error: ETIMEDOUT");
	});

	it("names every code it can be asked about", () => {
		const codes = Object.keys(IMAGE_ERROR_STATUS) as ImageErrorCode[];

		expect(codes).toHaveLength(14);
		expect(new Set(codes).size).toBe(codes.length);
	});
});
