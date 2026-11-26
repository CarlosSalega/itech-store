import type { ImageErrorCode } from "./errors";

export interface UploadableFile {
	readonly size: number;
	readonly type: string;
	readonly name?: string;
	arrayBuffer(): Promise<ArrayBuffer>;
}

export interface UploadResult {
	readonly key: string;
	readonly url: string;
}

export interface DeleteSuccess {
	readonly success: true;
}

export interface DeleteFailure {
	readonly success: false;
	readonly code: ImageErrorCode;
	readonly details?: Record<string, unknown>;
}

export type DeleteResult = DeleteSuccess | DeleteFailure;

export interface DeleteManyResult {
	readonly successful: number;
	readonly failed: number;
}

export interface UploadOptions {
	readonly folder?: string;
	readonly tags?: readonly string[];
	readonly publicId?: string;
	readonly overwrite?: boolean;
	readonly signal?: AbortSignal;
}

export interface ImageProvider {
	upload(file: UploadableFile, options?: UploadOptions): Promise<UploadResult>;
	delete(key: string): Promise<DeleteResult>;
	deleteMany(keys: string[]): Promise<DeleteManyResult>;
}
