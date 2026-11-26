import { IMAGE_UPLOAD_LIMITS } from "./limits";
import type { UploadableFile } from "./types";

export interface UploadValidationPolicy {
	readonly maxBytes?: number;
	readonly allowedMimeTypes?: readonly string[];
}

export type FileRejectionCode = "NO_FILE" | "INVALID_TYPE" | "TOO_LARGE";

export interface FileRejection {
	readonly ok: false;
	readonly code: FileRejectionCode;
	readonly details: Record<string, unknown>;
}

export type FileValidation = { readonly ok: true; readonly file: UploadableFile } | FileRejection;

export function isUploadableFile(value: unknown): value is UploadableFile {
	if (typeof value !== "object" || value === null) return false;

	const candidate = value as Record<string, unknown>;

	return (
		typeof candidate["arrayBuffer"] === "function" &&
		typeof candidate["size"] === "number" &&
		typeof candidate["type"] === "string"
	);
}

export function validateUploadFile(
	input: unknown,
	policy: UploadValidationPolicy = IMAGE_UPLOAD_LIMITS,
): FileValidation {
	if (!isUploadableFile(input)) {
		return {
			ok: false,
			code: "NO_FILE",
			details: { received: input === null ? "null" : typeof input },
		};
	}

	const accepted = [...(policy.allowedMimeTypes ?? IMAGE_UPLOAD_LIMITS.allowedMimeTypes)];
	const requestedType = input.type.toLowerCase();
	const typeAccepted = accepted.some((entry) => entry.toLowerCase() === requestedType);

	if (!typeAccepted) {
		return { ok: false, code: "INVALID_TYPE", details: { type: input.type, accepted } };
	}

	if (input.size <= 0) {
		return { ok: false, code: "NO_FILE", details: { received: "empty", size: input.size } };
	}

	if (policy.maxBytes !== undefined && input.size > policy.maxBytes) {
		return { ok: false, code: "TOO_LARGE", details: { size: input.size, maxBytes: policy.maxBytes } };
	}

	return { ok: true, file: input };
}

export async function validateParsedUpload(
	input: unknown,
	policy: UploadValidationPolicy = IMAGE_UPLOAD_LIMITS,
): Promise<FileValidation> {
	const validation = validateUploadFile(input, policy);

	if (!validation.ok || policy.maxBytes === undefined) return validation;

	const bytes = await validation.file.arrayBuffer();

	if (bytes.byteLength <= policy.maxBytes) return validation;

	return {
		ok: false,
		code: "TOO_LARGE",
		details: {
			size: bytes.byteLength,
			maxBytes: policy.maxBytes,
			declaredSize: validation.file.size,
		},
	};
}
