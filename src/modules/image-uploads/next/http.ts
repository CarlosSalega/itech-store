import type { ImageErrorCode } from "../core/errors";
import { statusForImageError } from "../core/errors";
import { imageErrorMessage } from "../core/messages";

export interface JsonRequest {
	json(): Promise<unknown>;
}

export interface JsonObject {
	readonly [field: string]: unknown;
}

/**
 * The one place a module code becomes an HTTP answer: the status is the
 * module's own mapping, never a number written here.
 */
export function imageResponse(code: ImageErrorCode, message?: string): Response {
	return Response.json(
		{ error: message ?? imageErrorMessage(code) },
		{ status: statusForImageError(code) },
	);
}

/**
 * A body that is not a JSON object reads as an empty one, so no field
 * validates and the caller answers MISSING_KEY instead of throwing.
 */
export async function readJsonObject(request: JsonRequest): Promise<JsonObject> {
	try {
		const body: unknown = await request.json();

		if (typeof body !== "object" || body === null || Array.isArray(body)) return {};

		return body as JsonObject;
	} catch {
		return {};
	}
}

export function readText(body: JsonObject, field: string): string | null {
	const value = body[field];

	if (typeof value !== "string") return null;

	const trimmed = value.trim();

	return trimmed === "" ? null : trimmed;
}
