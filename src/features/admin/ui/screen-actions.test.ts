import { describe, expect, it } from "vitest";

import {
	ADMIN_ACTION_MESSAGES,
	type AdminActionResult,
} from "../server/product-actions";
import {
	IDLE_FEEDBACK,
	PENDING_FEEDBACK,
	UNREACHABLE_MESSAGE,
	feedbackOf,
	runAction,
} from "./screen-actions";

const SUCCESS: AdminActionResult = { ok: true, slug: "apple-ipad-pro" };

describe("the screens' action boundary", () => {
	it("keeps the success the action answered", async () => {
		await expect(runAction(async () => SUCCESS)).resolves.toEqual(SUCCESS);
		expect(feedbackOf(SUCCESS)).toEqual(IDLE_FEEDBACK);
	});

	for (const [code, message] of Object.entries(ADMIN_ACTION_MESSAGES)) {
		it(`turns ${code} into the action's message in the screen lane`, async () => {
			const refusal: AdminActionResult = {
				ok: false,
				code: code as keyof typeof ADMIN_ACTION_MESSAGES,
				message,
			};

			await expect(runAction(async () => refusal)).resolves.toEqual(refusal);
			expect(feedbackOf(refusal)).toEqual({ pending: false, message });
		});
	}

	it("keeps the pending state distinct from a finished action", () => {
		expect(PENDING_FEEDBACK).toEqual({ pending: true, message: null });
		expect(PENDING_FEEDBACK).not.toEqual(IDLE_FEEDBACK);
	});

	it("answers a request that never reached the action without claiming success", async () => {
		const refusal = await runAction(async () => {
			throw new Error("offline");
		});

		expect(refusal.ok).toBe(false);
		expect(refusal.ok ? "" : refusal.message).toBe(UNREACHABLE_MESSAGE);
		expect(feedbackOf(refusal)).toEqual({
			pending: false,
			message: UNREACHABLE_MESSAGE,
		});
	});
});
