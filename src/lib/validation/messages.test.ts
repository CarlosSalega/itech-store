import { describe, expect, it } from "vitest";
import { z, type ZodType } from "zod";

import { FIELD_FALLBACK_MESSAGE } from "./copy";
import { messagesFromError, type FieldMessages } from "./messages";

const COPY: FieldMessages<"email" | "password" | "name"> = {
	email: "Ese email no parece válido.",
	name: "Escribí tu nombre y apellido.",
	password: "Escribí tu contraseña.",
};

const LIBRARY_TEXT = /invalid|expected|too small|unrecognized/i;

function issuesOf(schema: ZodType, value: unknown): z.ZodError {
	const result = schema.safeParse(value);

	if (result.success) throw new Error("the fixture was expected to be rejected");

	return result.error;
}

describe("the issue-to-copy mapper", () => {
	it("returns one message per field even when the schema reports several problems for it", () => {
		const schema = z.object({ email: z.string().min(10).regex(/^\d+$/) });

		const messages = messagesFromError(issuesOf(schema, { email: "ab" }), COPY);

		expect(Object.keys(messages)).toEqual(["email"]);
		expect(messages).toEqual({ email: COPY.email });
	});

	it("ignores an issue whose path does not address one field", () => {
		const nested = z.object({ buyer: z.object({ email: z.email() }) });
		const root = z.string().refine(() => false);
		const copy: FieldMessages<string> = { buyer: "Revisá los datos del comprador." };

		expect(messagesFromError(issuesOf(nested, { buyer: { email: "nope" } }), copy)).toEqual({});
		expect(messagesFromError(issuesOf(root, "nope"), copy)).toEqual({});
	});

	it("falls back when the copy does not name the field the schema rejects", () => {
		const schema = z.object({ nickname: z.string().min(1) });

		expect(messagesFromError(issuesOf(schema, { nickname: "" }), COPY)).toEqual({
			nickname: FIELD_FALLBACK_MESSAGE,
		});
	});

	it("never hands the library's own wording to a caller", () => {
		const schema = z.object({ email: z.email(), name: z.string().min(1) });

		const messages = messagesFromError(issuesOf(schema, { email: "sofia", name: "" }), COPY);

		expect(messages).toEqual({
			email: COPY.email,
			name: COPY.name,
		});

		for (const message of Object.values(messages)) {
			expect(message).not.toMatch(LIBRARY_TEXT);
		}
	});

	it("maps a real payload field by field through the copy it was given", () => {
		const schema = z.object({
			email: z.email(),
			password: z.string().min(1),
		});

		const messages = messagesFromError(issuesOf(schema, { email: "sofia@", password: "" }), COPY);

		expect(messages).toEqual({
			email: "Ese email no parece válido.",
			password: "Escribí tu contraseña.",
		});
	});
});
