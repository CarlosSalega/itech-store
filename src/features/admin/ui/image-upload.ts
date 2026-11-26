import {
	type ImageErrorCode,
	imageErrorMessage,
	validateUploadFile,
} from "@/modules/image-uploads/core";

export const SIGN_PATH = "/api/uploads/sign";
export const RECORD_PATH = "/api/uploads";

export const UPLOAD_FAILED_MESSAGE = imageErrorMessage("UPLOAD_FAILED");

export type SendRequest = (input: string, init?: RequestInit) => Promise<Response>;

export type ImageUploadRequest = {
	readonly file: File;
	readonly scope: string;
	readonly productId?: string | null;
	readonly alt: string;
	readonly send?: SendRequest;
};

export type UploadedImage = {
	readonly key: string;
	readonly url: string;
};

type SignedUpload = {
	readonly signature: string;
	readonly timestamp: number;
	readonly apiKey: string;
	readonly folder: string;
	readonly publicId: string;
	readonly key: string;
	readonly uploadUrl: string;
};

export class ImageUploadError extends Error {
	readonly code: ImageErrorCode;

	constructor(code: ImageErrorCode, message?: string) {
		super(message ?? imageErrorMessage(code));
		this.code = code;
		this.name = "ImageUploadError";
	}
}

function readField(body: unknown, field: string): string | null {
	if (typeof body !== "object" || body === null) return null;

	const value = (body as Record<string, unknown>)[field];

	if (typeof value !== "string") return null;

	const trimmed = value.trim();

	return trimmed === "" ? null : trimmed;
}

async function readRefusal(response: Response, code: ImageErrorCode): Promise<ImageUploadError> {
	const body: unknown = await response.json().catch(() => null);

	return new ImageUploadError(code, readField(body, "error") ?? undefined);
}

async function attempt(
	send: SendRequest,
	url: string,
	init: RequestInit,
	code: ImageErrorCode,
): Promise<Response> {
	let response: Response;

	try {
		response = await send(url, init);
	} catch {
		throw new ImageUploadError(code);
	}

	if (!response.ok) throw await readRefusal(response, code);

	return response;
}

function parseSigned(body: unknown): SignedUpload | null {
	const signature = readField(body, "signature");
	const apiKey = readField(body, "apiKey");
	const folder = readField(body, "folder");
	const publicId = readField(body, "publicId");
	const key = readField(body, "key");
	const uploadUrl = readField(body, "uploadUrl");
	const timestamp =
		typeof body === "object" && body !== null
			? (body as Record<string, unknown>)["timestamp"]
			: null;

	if (
		signature === null ||
		apiKey === null ||
		folder === null ||
		publicId === null ||
		key === null ||
		uploadUrl === null ||
		typeof timestamp !== "number" ||
		!Number.isInteger(timestamp)
	) {
		return null;
	}

	return { signature, timestamp, apiKey, folder, publicId, key, uploadUrl };
}

async function sign(send: SendRequest, scope: string): Promise<SignedUpload> {
	const response = await attempt(
		send,
		SIGN_PATH,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ productId: scope }),
		},
		"UPLOAD_FAILED",
	);

	const signed = parseSigned(await response.json().catch(() => null));

	if (signed === null) throw new ImageUploadError("MISCONFIGURED");

	return signed;
}

async function postFile(
	send: SendRequest,
	signed: SignedUpload,
	file: File,
): Promise<string> {
	const form = new FormData();

	form.append("file", file);
	form.append("api_key", signed.apiKey);
	form.append("signature", signed.signature);
	form.append("timestamp", String(signed.timestamp));
	form.append("folder", signed.folder);
	form.append("public_id", signed.publicId);

	const response = await attempt(
		send,
		signed.uploadUrl,
		{ method: "POST", body: form },
		"UPLOAD_FAILED",
	);
	const url = readField(await response.json().catch(() => null), "secure_url");

	if (url === null) throw new ImageUploadError("UPLOAD_FAILED");

	return url;
}

async function record(
	send: SendRequest,
	input: {
		readonly key: string;
		readonly url: string;
		readonly productId: string | null;
		readonly alt: string;
	},
): Promise<void> {
	const body =
		input.productId === null
			? { key: input.key, url: input.url, alt: input.alt }
			: { key: input.key, url: input.url, productId: input.productId, alt: input.alt };

	await attempt(
		send,
		RECORD_PATH,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		},
		"UPLOAD_FAILED",
	);
}

export async function uploadProductImage(
	request: ImageUploadRequest,
): Promise<UploadedImage> {
	const validation = validateUploadFile(request.file);

	if (!validation.ok) throw new ImageUploadError(validation.code);

	const send: SendRequest =
		request.send ?? ((input, init) => globalThis.fetch(input, init));
	const signed = await sign(send, request.scope);
	const url = await postFile(send, signed, request.file);

	await record(send, {
		key: signed.key,
		url,
		productId: request.productId ?? null,
		alt: request.alt,
	});

	return { key: signed.key, url };
}
