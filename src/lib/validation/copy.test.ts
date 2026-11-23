import { describe, expect, it } from "vitest";

import { FIELD_FALLBACK_MESSAGE, MESSAGE_MAX_LENGTH } from "./copy";

describe("the validation copy", () => {
	it("records a length every message fits in one caption line at 320px", () => {
		expect(MESSAGE_MAX_LENGTH).toBe(44);
	});

	it("keeps the shared fallback inside that length", () => {
		expect(FIELD_FALLBACK_MESSAGE.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
	});
});
