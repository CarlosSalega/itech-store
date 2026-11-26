import { describe, expect, it } from "vitest";

import { IMAGE_UPLOAD_LIMITS } from "./index";

describe("the upload limits", () => {
	it("allows five megabytes", () => {
		expect(IMAGE_UPLOAD_LIMITS.maxBytes).toBe(5 * 1024 * 1024);
	});

	it("accepts the four photographic formats", () => {
		expect(IMAGE_UPLOAD_LIMITS.allowedMimeTypes).toEqual([
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/avif",
		]);
	});

	it("is frozen, so a module cannot change the defaults while running", () => {
		expect(Object.isFrozen(IMAGE_UPLOAD_LIMITS)).toBe(true);
		expect(Object.isFrozen(IMAGE_UPLOAD_LIMITS.allowedMimeTypes)).toBe(true);
	});
});
