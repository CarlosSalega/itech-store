import { ImageError } from "./errors";
import type { ImageProvider, UploadOptions, UploadResult } from "./types";
import { validateParsedUpload } from "./validate";
import type { UploadValidationPolicy } from "./validate";

export interface UploadImageOptions {
	readonly policy?: UploadValidationPolicy;
	readonly upload?: UploadOptions;
}

export async function uploadImage(
	provider: ImageProvider,
	input: unknown,
	options: UploadImageOptions = {},
): Promise<UploadResult> {
	const validation = await validateParsedUpload(input, options.policy);

	if (!validation.ok) {
		throw new ImageError(validation.code, { details: validation.details });
	}

	return provider.upload(validation.file, options.upload);
}
