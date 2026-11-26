import { v2 as cloudinary } from "cloudinary";

import { mapWithConcurrency } from "../core/concurrency";
import { ImageError, describeError, isImageError } from "../core/errors";
import type {
	DeleteManyResult,
	DeleteResult,
	ImageProvider,
	UploadableFile,
	UploadOptions,
	UploadResult,
} from "../core/types";

export interface CloudinaryCredentials {
	readonly cloudName: string;
	readonly apiKey: string;
	readonly apiSecret: string;
}

export interface CloudinaryUploadResponse {
	readonly public_id: string;
	readonly secure_url: string;
}

export interface CloudinaryUploadStream {
	end(chunk?: unknown): void;
	destroy?(): void;
}

export interface CloudinarySdk {
	readonly uploader: {
		upload_stream(
			options: Record<string, unknown>,
			callback: (error: unknown, result?: CloudinaryUploadResponse) => void,
		): CloudinaryUploadStream;
		destroy(
			publicId: string,
			options?: Record<string, unknown>,
		): Promise<{ readonly result: string }>;
	};
}

export interface CloudinaryProviderConfig extends CloudinaryCredentials {
	readonly sdk?: CloudinarySdk;
	readonly concurrency?: number;
}

export type UploadScope =
	| { readonly productId: string }
	| { readonly storeId: string };

export interface SignUploadRequest {
	readonly scope: UploadScope;
	readonly timestamp?: number;
	readonly publicId?: string;
}

export interface SignedUpload {
	readonly signature: string;
	readonly timestamp: number;
	readonly apiKey: string;
	readonly cloudName: string;
	readonly folder: string;
	readonly publicId: string;
	readonly key: string;
	readonly uploadUrl: string;
}

export interface ImageUploadProvider extends ImageProvider {
	signUpload(request: SignUploadRequest): SignedUpload;
}

export const CLOUDINARY_ENV_KEYS = {
	cloudName: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
	apiKey: "CLOUDINARY_API_KEY",
	apiSecret: "CLOUDINARY_API_SECRET",
} as const;

export const UPLOAD_SCOPE_SEGMENTS = {
	product: "products",
	store: "stores",
} as const;

export const CLOUDINARY_API_BASE = "https://api.cloudinary.com/v1_1";

export const DEFAULT_DELETE_CONCURRENCY = 8;

const SCOPED_FOLDER = /^(?:products|stores)\/[A-Za-z0-9_-]+$/;
const SCOPE_ID = /^[A-Za-z0-9_-]+$/;

export class CloudinaryConfigError extends Error {
	readonly missing: readonly string[];

	constructor(missing: readonly string[]) {
		super(`Cloudinary is not configured: ${missing.join(", ")}`);
		this.name = "CloudinaryConfigError";
		this.missing = missing;
	}
}

export function cloudinaryConfigFromEnv(
	env: Readonly<Record<string, string | undefined>>,
): CloudinaryCredentials {
	return requireCredentials({
		cloudName: env[CLOUDINARY_ENV_KEYS.cloudName],
		apiKey: env[CLOUDINARY_ENV_KEYS.apiKey],
		apiSecret: env[CLOUDINARY_ENV_KEYS.apiSecret],
	});
}

export function uploadScopePrefix(scope: UploadScope): string {
	const isProduct = "productId" in scope;
	const segment = isProduct ? UPLOAD_SCOPE_SEGMENTS.product : UPLOAD_SCOPE_SEGMENTS.store;
	const id = (isProduct ? scope.productId : scope.storeId).trim();

	if (!SCOPE_ID.test(id)) {
		throw new ImageError("MISSING_KEY", { details: { scope: segment } });
	}

	return `${segment}/${id}`;
}

export function createCloudinaryProvider(config: CloudinaryProviderConfig): ImageUploadProvider {
	const credentials = requireCredentials(config);
	const sdk = config.sdk ?? (cloudinary as unknown as CloudinarySdk);
	const deleteConcurrency = config.concurrency ?? DEFAULT_DELETE_CONCURRENCY;

	if (config.sdk === undefined) {
		(cloudinary as unknown as { config(options: Record<string, unknown>): unknown }).config({
			cloud_name: credentials.cloudName,
			api_key: credentials.apiKey,
			api_secret: credentials.apiSecret,
			secure: true,
		});
	}

	async function upload(file: UploadableFile, options?: UploadOptions): Promise<UploadResult> {
		const folder = options?.folder;

		if (folder === undefined || !SCOPED_FOLDER.test(folder)) {
			throw new ImageError("UPLOAD_FAILED", {
				details: { reason: "UNSCOPED_FOLDER", folder: folder ?? null },
			});
		}

		const publicId = options?.publicId ?? randomId();
		const uploadOptions: Record<string, unknown> = {
			resource_type: "image",
			invalidate: true,
			overwrite: options?.overwrite ?? false,
			folder,
			public_id: publicId,
		};

		if (options?.tags !== undefined && options.tags.length > 0) {
			uploadOptions["tags"] = [...options.tags];
		}

		let buffer: Buffer;

		try {
			buffer = Buffer.from(await file.arrayBuffer());
		} catch (error) {
			throw new ImageError("UPLOAD_FAILED", { details: { folder }, cause: error });
		}

		const response = await deliver(buffer, uploadOptions, options?.signal).catch((error: unknown) => {
			if (isImageError(error)) throw error;

			throw new ImageError("UPLOAD_FAILED", { details: { folder }, cause: error });
		});

		if (response.public_id === "" || response.secure_url === "") {
			throw new ImageError("UPLOAD_FAILED", {
				details: { folder, reason: "EMPTY_RESPONSE" },
			});
		}

		return { key: response.public_id, url: response.secure_url };
	}

	function deliver(
		buffer: Buffer,
		options: Record<string, unknown>,
		signal?: AbortSignal,
	): Promise<CloudinaryUploadResponse> {
		return new Promise<CloudinaryUploadResponse>((resolve, reject) => {
			function settle(): void {
				signal?.removeEventListener("abort", onAbort);
			}

			function fail(error: unknown): void {
				settle();
				reject(error);
			}

			function onAbort(): void {
				stream.destroy?.();
				fail(new ImageError("UPLOAD_FAILED", { details: { reason: "ABORTED" } }));
			}

			const stream = sdk.uploader.upload_stream(options, (error, result) => {
				if (error) {
					fail(error);
					return;
				}

				if (result === undefined) {
					fail(new Error("empty response"));
					return;
				}

				settle();
				resolve(result);
			});

			if (signal?.aborted === true) {
				onAbort();
				return;
			}

			signal?.addEventListener("abort", onAbort, { once: true });
			stream.end(buffer);
		});
	}

	async function remove(key: string): Promise<DeleteResult> {
		const publicId = key.trim();

		if (publicId === "") return { success: false, code: "MISSING_KEY" };

		try {
			const result = await sdk.uploader.destroy(publicId, {
				invalidate: true,
				resource_type: "image",
			});

			if (result.result === "ok" || result.result === "not found") return { success: true };

			return {
				success: false,
				code: "DELETE_FAILED",
				details: { key: publicId, result: result.result },
			};
		} catch (error) {
			return {
				success: false,
				code: "DELETE_FAILED",
				details: { key: publicId, reason: describeError(error) },
			};
		}
	}

	async function removeMany(keys: string[]): Promise<DeleteManyResult> {
		const results = await mapWithConcurrency(keys, deleteConcurrency, (key) => remove(key));
		const successful = results.filter((result) => result.success).length;

		return { successful, failed: keys.length - successful };
	}

	function signUpload(request: SignUploadRequest): SignedUpload {
		const folder = uploadScopePrefix(request.scope);
		const timestamp = request.timestamp ?? Math.floor(Date.now() / 1000);
		const publicId = request.publicId ?? randomId();
		const signature = cloudinary.utils.api_sign_request(
			{ folder, public_id: publicId, timestamp },
			credentials.apiSecret,
		);

		return {
			signature,
			timestamp,
			apiKey: credentials.apiKey,
			cloudName: credentials.cloudName,
			folder,
			publicId,
			key: `${folder}/${publicId}`,
			uploadUrl: `${CLOUDINARY_API_BASE}/${credentials.cloudName}/image/upload`,
		};
	}

	return { upload, delete: remove, deleteMany: removeMany, signUpload };
}

function requireCredentials(values: {
	readonly cloudName?: string;
	readonly apiKey?: string;
	readonly apiSecret?: string;
}): CloudinaryCredentials {
	const cloudName = values.cloudName?.trim() ?? "";
	const apiKey = values.apiKey?.trim() ?? "";
	const apiSecret = values.apiSecret?.trim() ?? "";
	const missing: string[] = [];

	if (cloudName === "") missing.push(CLOUDINARY_ENV_KEYS.cloudName);
	if (apiKey === "") missing.push(CLOUDINARY_ENV_KEYS.apiKey);
	if (apiSecret === "") missing.push(CLOUDINARY_ENV_KEYS.apiSecret);

	if (missing.length > 0) throw new CloudinaryConfigError(missing);

	return { cloudName, apiKey, apiSecret };
}

function randomId(): string {
	return globalThis.crypto.randomUUID();
}
