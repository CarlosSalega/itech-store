import { APIError } from "better-auth";

const ALREADY_REGISTERED = "USER_ALREADY_EXISTS";

export function alreadyRegistered(error: unknown): boolean {
	if (!(error instanceof APIError)) return false;

	const code = error.body?.code;

	return typeof code === "string" && code.startsWith(ALREADY_REGISTERED);
}
