import { describe, expect, it, vi } from "vitest";

import { createResendSender, resolveEmailEnv } from "./resend";

function okResponse() {
	return new Response(JSON.stringify({ id: "email-1" }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

describe("resolveEmailEnv", () => {
	it("refuses a missing or blank key or sender", () => {
		expect(() => resolveEmailEnv({}, {})).toThrow("RESEND_API_KEY is not set");
		expect(() => resolveEmailEnv({ RESEND_API_KEY: " " }, {})).toThrow(
			"RESEND_API_KEY is not set",
		);
		expect(() =>
			resolveEmailEnv({ RESEND_API_KEY: "re-key" }, {}),
		).toThrow("RESEND_FROM_EMAIL is not set");
	});

	it("answers the trimmed values when both are set", () => {
		const env = resolveEmailEnv(
			{ RESEND_API_KEY: " re-key " },
			{ RESEND_FROM_EMAIL: " ventas@itechstore.com " },
		);

		expect(env).toEqual({
			apiKey: "re-key",
			from: "ventas@itechstore.com",
		});
	});
});

describe("createResendSender", () => {
	it("posts to Resend with the from, the to, the subject and the html", async () => {
		const fetch = vi.fn().mockResolvedValue(okResponse());
		const send = createResendSender({ apiKey: "re-key", from: "ventas@itechstore.com" }, fetch);

		await send({
			to: "sofia@example.com",
			subject: "Tu enlace de acceso",
			html: "<p>Entrá</p>",
		});

		expect(fetch).toHaveBeenCalledWith(
			"https://api.resend.com/emails",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					authorization: "Bearer re-key",
					"content-type": "application/json",
				}),
			}),
		);

		const [url, init] = fetch.mock.calls[0] as unknown as [
			string,
			{ body: string },
		];

		expect(url).toBe("https://api.resend.com/emails");
		expect(JSON.parse(init.body)).toEqual({
			from: "ventas@itechstore.com",
			to: ["sofia@example.com"],
			subject: "Tu enlace de acceso",
			html: "<p>Entrá</p>",
		});
	});

	it("answers a sent result", async () => {
		const fetch = vi.fn().mockResolvedValue(okResponse());
		const send = createResendSender({ apiKey: "re-key", from: "ventas@itechstore.com" }, fetch);

		expect(await send({ to: "a@b.com", subject: "s", html: "h" })).toEqual({
			ok: true,
			id: "email-1",
		});
	});

	it("answers a rate limit with its own copy", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(new Response('{"name":"rate_limit_error"}', { status: 429 }));
		const send = createResendSender({ apiKey: "re-key", from: "ventas@itechstore.com" }, fetch);

		const result = await send({ to: "a@b.com", subject: "s", html: "h" });

		expect(result).toEqual({
			ok: false,
			code: "EMAIL_RATE_LIMITED",
		});
	});

	it("answers an invalid recipient with its own copy", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				new Response('{"name":"validation_error","message":"invalid email"}', {
					status: 422,
				}),
			);
		const send = createResendSender({ apiKey: "re-key", from: "ventas@itechstore.com" }, fetch);

		expect(await send({ to: "a@b.com", subject: "s", html: "h" })).toEqual({
			ok: false,
			code: "EMAIL_INVALID_RECIPIENT",
		});
	});

	it("answers any other failure with a generic copy", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(new Response('{"name":"unknown"}', { status: 500 }));
		const send = createResendSender({ apiKey: "re-key", from: "ventas@itechstore.com" }, fetch);

		expect(await send({ to: "a@b.com", subject: "s", html: "h" })).toEqual({
			ok: false,
			code: "EMAIL_NOT_SENT",
		});
	});

	it("answers a network failure with the generic copy", async () => {
		const fetch = vi.fn().mockRejectedValue(new Error("offline"));
		const send = createResendSender({ apiKey: "re-key", from: "ventas@itechstore.com" }, fetch);

		expect(await send({ to: "a@b.com", subject: "s", html: "h" })).toEqual({
			ok: false,
			code: "EMAIL_NOT_SENT",
		});
	});

	it("answers a non-json failure body with the generic copy", async () => {
		const fetch = vi.fn().mockResolvedValue(new Response("oops", { status: 502 }));
		const send = createResendSender({ apiKey: "re-key", from: "ventas@itechstore.com" }, fetch);

		expect(await send({ to: "a@b.com", subject: "s", html: "h" })).toEqual({
			ok: false,
			code: "EMAIL_NOT_SENT",
		});
	});
});
