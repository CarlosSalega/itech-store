import { z } from "zod";

import { messagesFromError, type FieldMessages } from "@/lib/validation/messages";

import { INVALID_EMAIL, MISSING_PASSWORD } from "./copy";

export const LOGIN_FIELDS = ["email", "password"] as const;

export type LoginField = (typeof LOGIN_FIELDS)[number];

export type LoginMessages = FieldMessages<LoginField>;

export const LOGIN_SCHEMA = z.object({
	email: z.email(),
	password: z.string().min(1),
});

export type LoginPayload = z.infer<typeof LOGIN_SCHEMA>;

export const EMPTY_LOGIN: LoginPayload = { email: "", password: "" };

export const LOGIN_FIELD_MESSAGES: Record<LoginField, string> = {
	email: INVALID_EMAIL,
	password: MISSING_PASSWORD,
};

export function loginPayload(formData: FormData): LoginPayload {
	const email = formData.get("email");
	const password = formData.get("password");

	return {
		email: typeof email === "string" ? email.trim() : "",
		password: typeof password === "string" ? password : "",
	};
}

export function payloadMessages(payload: LoginPayload): LoginMessages {
	const result = LOGIN_SCHEMA.safeParse(payload);

	return result.success ? {} : messagesFromError(result.error, LOGIN_FIELD_MESSAGES);
}

export function rejectedFields(messages: LoginMessages): readonly LoginField[] {
	return LOGIN_FIELDS.filter((field) => messages[field] !== undefined);
}

export function loginMessages(
	payload: LoginPayload,
	submitted: boolean,
): LoginMessages {
	return submitted ? payloadMessages(payload) : {};
}
