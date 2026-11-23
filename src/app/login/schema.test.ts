import { describe, expect, it } from "vitest";

import { MESSAGE_MAX_LENGTH } from "@/lib/validation/copy";

import { INVALID_EMAIL, MISSING_PASSWORD } from "./copy";
import {
	EMPTY_LOGIN,
	LOGIN_FIELD_MESSAGES,
	loginMessages,
	loginPayload,
	rejectedFields,
} from "./schema";

const EMPTY = EMPTY_LOGIN;

describe("the messages the login shows", () => {
	it("says nothing while the visitor has not submitted the form", () => {
		expect(loginMessages(EMPTY, false)).toEqual({});
	});

	it("stays quiet on the first keystrokes of a field nobody submitted", () => {
		expect(loginMessages({ email: "sofia", password: "" }, false)).toEqual({});
		expect(loginMessages({ email: "", password: "s" }, false)).toEqual({});
	});

	it("names every field the payload is missing after a failed submit", () => {
		expect(loginMessages(EMPTY, true)).toEqual({
			email: INVALID_EMAIL,
			password: MISSING_PASSWORD,
		});
	});

	it("revalidates a rejected field as the visitor corrects it", () => {
		expect(loginMessages({ email: "sofia", password: "" }, true)).toEqual({
			email: INVALID_EMAIL,
			password: MISSING_PASSWORD,
		});
		expect(loginMessages({ email: "sofia@example.com", password: "" }, true)).toEqual({
			password: MISSING_PASSWORD,
		});
		expect(loginMessages({ email: "sofia@example.com", password: "x" }, true)).toEqual({});
	});

	it("reads the payload the same way the action does", () => {
		const data = new FormData();

		data.set("email", "  sofia.ramos@example.com ");
		data.set("password", " una contraseña ");

		expect(loginPayload(data)).toEqual({
			email: "sofia.ramos@example.com",
			password: " una contraseña ",
		});
		expect(loginMessages(loginPayload(data), true)).toEqual({});
	});

	it("keeps every field message inside one caption line", () => {
		for (const message of Object.values(LOGIN_FIELD_MESSAGES)) {
			expect(message.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
		}
	});

	it("hands the first rejected field to the visitor's focus", () => {
		expect(rejectedFields({ email: INVALID_EMAIL, password: MISSING_PASSWORD })).toEqual([
			"email",
			"password",
		]);
		expect(rejectedFields({ password: MISSING_PASSWORD })).toEqual(["password"]);
		expect(rejectedFields({})).toEqual([]);
	});
});
