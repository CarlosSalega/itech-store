import type { ZodError } from "zod";

import { FIELD_FALLBACK_MESSAGE } from "./copy";

export type FieldMessages<Field extends string> = Partial<Record<Field, string>>;

export function messagesFromError<Field extends string>(
	error: ZodError,
	copy: FieldMessages<Field>,
): FieldMessages<Field> {
	const messages: FieldMessages<Field> = {};

	for (const issue of error.issues) {
		if (issue.path.length !== 1) continue;

		const [name] = issue.path;

		if (typeof name !== "string") continue;
		if (Object.hasOwn(messages, name)) continue;

		const field = name as Field;

		messages[field] = copy[field] ?? FIELD_FALLBACK_MESSAGE;
	}

	return messages;
}
