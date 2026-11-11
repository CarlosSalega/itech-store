import { describe, expect, it } from "vitest";

import { mailtoHref, whatsappHref } from "./contact-channels";

describe("whatsappHref", () => {
	it("strips everything that is not a digit", () => {
		expect(whatsappHref("+54 9 11 2345-6789")).toBe("https://wa.me/5491123456789");
	});

	it("keeps an already-normalised number untouched", () => {
		expect(whatsappHref("5491123456789")).toBe("https://wa.me/5491123456789");
	});
});

describe("mailtoHref", () => {
	it("builds a mailto link from a plain address", () => {
		expect(mailtoHref("ventas@example.com")).toBe("mailto:ventas@example.com");
	});
});
