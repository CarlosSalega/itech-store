import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { ImageError } from "../core/errors";
import {
	CLOUDINARY_ENV_KEYS,
	CloudinaryConfigError,
	cloudinaryConfigFromEnv,
	createCloudinaryProvider,
} from "./cloudinary";
import type { CloudinarySdk, CloudinaryUploadResponse } from "./cloudinary";

interface UploadCall {
	readonly options: Record<string, unknown>;
	readonly chunk: unknown;
}

type UploadResponse =
	| { readonly error: unknown }
	| { readonly result: CloudinaryUploadResponse };

function uploadOk(): UploadResponse {
	return {
		result: {
			public_id: "",
			secure_url: "https://res.cloudinary.com/demo/image/upload/asset.png",
		},
	};
}

function fakeSdk(respond: (options: Record<string, unknown>) => UploadResponse = uploadOk) {
	const uploads: UploadCall[] = [];
	const destroyed: string[] = [];
	let destroyResult: Promise<{ readonly result: string }> = Promise.resolve({ result: "ok" });

	const sdk: CloudinarySdk = {
		uploader: {
			upload_stream(options, callback) {
				return {
					end(chunk) {
						uploads.push({ options, chunk });

						const response = respond(options);

						if ("error" in response) {
							callback(response.error);
							return;
						}

						const publicId = `${String(options["folder"])}/${String(options["public_id"])}`;

						callback(null, { ...response.result, public_id: publicId });
					},
				};
			},
			destroy(publicId) {
				destroyed.push(publicId);

				return destroyResult;
			},
		},
	};

	function failDestroy(error: unknown): void {
		destroyResult = Promise.reject(error);
	}

	function answerDestroy(result: string): void {
		destroyResult = Promise.resolve({ result });
	}

	return { sdk, uploads, destroyed, failDestroy, answerDestroy };
}

function makeFile(content = "bytes", type = "image/png", name = "foto.png"): File {
	return new File([new TextEncoder().encode(content)], name, { type });
}

const credentials = { cloudName: "demo", apiKey: "key", apiSecret: "s3cr3t" };

function providerFor(sdk: CloudinarySdk) {
	return createCloudinaryProvider({ ...credentials, sdk });
}

describe("the Cloudinary provider's upload", () => {
	it("returns the key Cloudinary stored under, namespaced to the product", async () => {
		const { sdk, uploads } = fakeSdk();
		const provider = providerFor(sdk);

		const stored = await provider.upload(makeFile(), { folder: "products/p1", publicId: "abc" });

		expect(stored).toEqual({
			key: "products/p1/abc",
			url: "https://res.cloudinary.com/demo/image/upload/asset.png",
		});
		expect(uploads).toHaveLength(1);
		expect(uploads[0]?.options).toMatchObject({
			folder: "products/p1",
			public_id: "abc",
			resource_type: "image",
		});
	});

	it("namespaces a store upload under its own folder", async () => {
		const provider = providerFor(fakeSdk().sdk);

		const stored = await provider.upload(makeFile(), { folder: "stores/s1", publicId: "abc" });

		expect(stored.key).toBe("stores/s1/abc");
	});

	it("gives two products the same file name different keys", async () => {
		const provider = providerFor(fakeSdk().sdk);

		const first = await provider.upload(makeFile(), { folder: "products/p1", publicId: "abc" });
		const second = await provider.upload(makeFile(), { folder: "products/p2", publicId: "abc" });

		expect(first.key).not.toBe(second.key);
	});

	it("refuses an upload that carries no namespaced folder and never reaches Cloudinary", async () => {
		const { sdk, uploads } = fakeSdk();
		const provider = providerFor(sdk);

		for (const options of [undefined, {}, { folder: "uploads" }, { folder: "products/" }]) {
			await expect(provider.upload(makeFile(), options)).rejects.toMatchObject({
				code: "UPLOAD_FAILED",
			});
		}

		expect(uploads).toHaveLength(0);
	});

	it("turns a Cloudinary failure into UPLOAD_FAILED without the library's sentence", async () => {
		const { sdk } = fakeSdk(() => ({ error: new Error("Invalid Signature 8f14e45") }));
		const provider = providerFor(sdk);

		const failure = await provider
			.upload(makeFile(), { folder: "products/p1" })
			.catch((error: unknown) => error);

		expect(failure).toBeInstanceOf(ImageError);
		expect((failure as ImageError).code).toBe("UPLOAD_FAILED");
		expect((failure as ImageError).message).toBe("UPLOAD_FAILED");
		expect((failure as ImageError).message).not.toContain("Invalid Signature");
		expect((failure as ImageError).details).toMatchObject({ folder: "products/p1" });
	});

	it("reports UPLOAD_FAILED when Cloudinary answers with nothing", async () => {
		const { sdk } = fakeSdk(() => ({ result: { public_id: "", secure_url: "" } }));
		const provider = providerFor(sdk);

		await expect(provider.upload(makeFile(), { folder: "products/p1" })).rejects.toMatchObject({
			code: "UPLOAD_FAILED",
		});
	});
});

describe("the Cloudinary provider's delete", () => {
	it("reports success without throwing", async () => {
		const { sdk, destroyed } = fakeSdk();
		const provider = providerFor(sdk);

		await expect(provider.delete("products/p1/abc")).resolves.toEqual({ success: true });
		expect(destroyed).toEqual(["products/p1/abc"]);
	});

	it("reports DELETE_FAILED when Cloudinary rejects the delete", async () => {
		const { sdk, failDestroy } = fakeSdk();
		failDestroy(new Error("Stale request - Signature mismatch"));
		const provider = providerFor(sdk);

		const result = await provider.delete("products/p1/abc");

		expect(result).toMatchObject({ success: false, code: "DELETE_FAILED" });
		expect(result).not.toHaveProperty("message");
	});

	it("reports DELETE_FAILED when Cloudinary answers with a result it did not store", async () => {
		const { sdk, answerDestroy } = fakeSdk();
		answerDestroy("error");
		const provider = providerFor(sdk);

		await expect(provider.delete("products/p1/abc")).resolves.toMatchObject({
			success: false,
			code: "DELETE_FAILED",
			details: { key: "products/p1/abc", result: "error" },
		});
	});

	it("treats a key Cloudinary never stored as a delete that needs no retry", async () => {
		const { sdk, answerDestroy } = fakeSdk();
		answerDestroy("not found");
		const provider = providerFor(sdk);

		await expect(provider.delete("products/p1/missing")).resolves.toEqual({ success: true });
	});

	it("reports MISSING_KEY without calling Cloudinary for a blank key", async () => {
		const { sdk, destroyed } = fakeSdk();
		const provider = providerFor(sdk);

		await expect(provider.delete("  ")).resolves.toMatchObject({
			success: false,
			code: "MISSING_KEY",
		});
		expect(destroyed).toEqual([]);
	});
});

describe("the Cloudinary provider's deleteMany", () => {
	it("counts what it could and could not delete without throwing", async () => {
		const { sdk, destroyed } = fakeSdk();
		sdk.uploader.destroy = async (publicId: string) => {
			destroyed.push(publicId);

			if (publicId.endsWith("gone")) throw new Error("upstream is down");

			return { result: "ok" };
		};
		const provider = providerFor(sdk);

		await expect(provider.deleteMany(["products/p1/one", "products/p1/gone"])).resolves.toEqual({
			successful: 1,
			failed: 1,
		});
		expect(destroyed).toHaveLength(2);
	});
});

describe("the signed upload", () => {
	it("signs a deterministic payload for a fixed timestamp and secret", () => {
		const provider = providerFor(fakeSdk().sdk);

		const signed = provider.signUpload({
			scope: { productId: "p1" },
			timestamp: 1_700_000_000,
			publicId: "abc",
		});

		const canonical = "folder=products/p1&public_id=abc&timestamp=1700000000";
		const expected = createHash("sha1").update(`${canonical}s3cr3t`).digest("hex");

		expect(signed).toMatchObject({
			signature: expected,
			timestamp: 1_700_000_000,
			apiKey: "key",
			cloudName: "demo",
			folder: "products/p1",
			publicId: "abc",
			key: "products/p1/abc",
		});
		expect(
			providerFor(fakeSdk().sdk).signUpload({
				scope: { productId: "p1" },
				timestamp: 1_700_000_000,
				publicId: "abc",
			}),
		).toEqual(signed);
	});

	it("changes the signature with the secret and never carries the secret itself", () => {
		const signed = providerFor(fakeSdk().sdk).signUpload({
			scope: { productId: "p1" },
			timestamp: 1_700_000_000,
			publicId: "abc",
		});
		const other = createCloudinaryProvider({
			...credentials,
			apiSecret: "another-secret",
			sdk: fakeSdk().sdk,
		}).signUpload({
			scope: { productId: "p1" },
			timestamp: 1_700_000_000,
			publicId: "abc",
		});

		expect(other.signature).not.toBe(signed.signature);
		expect(JSON.stringify(signed)).not.toContain("s3cr3t");
	});

	it("namespaces a store upload and keeps two products apart", () => {
		const provider = providerFor(fakeSdk().sdk);
		const request = { timestamp: 1_700_000_000, publicId: "abc" } as const;

		const product = provider.signUpload({ ...request, scope: { productId: "p1" } });
		const other = provider.signUpload({ ...request, scope: { productId: "p2" } });
		const store = provider.signUpload({ ...request, scope: { storeId: "s1" } });

		expect(product.key).toBe("products/p1/abc");
		expect(other.key).toBe("products/p2/abc");
		expect(store.key).toBe("stores/s1/abc");
		expect(product.signature).not.toBe(other.signature);
	});

	it("fills the timestamp and the public id when the caller brings neither", () => {
		const provider = providerFor(fakeSdk().sdk);

		const first = provider.signUpload({ scope: { productId: "p1" } });
		const second = provider.signUpload({ scope: { productId: "p1" } });

		expect(first.timestamp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
		expect(first.timestamp).toBeGreaterThan(Math.floor(Date.now() / 1000) - 60);
		expect(first.publicId).not.toBe("");
		expect(first.key).toBe(`products/p1/${first.publicId}`);
		expect(first.publicId).not.toBe(second.publicId);
	});

	it("refuses an empty scope identifier with a code from the module", () => {
		const provider = providerFor(fakeSdk().sdk);

		expect(() => provider.signUpload({ scope: { productId: "  " } })).toThrow(ImageError);
		expect(() => provider.signUpload({ scope: { storeId: "" } })).toThrow(ImageError);
	});

	it("points the browser at the upload endpoint of the configured cloud", () => {
		const signed = providerFor(fakeSdk().sdk).signUpload({ scope: { productId: "p1" } });

		expect(signed.uploadUrl).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
	});
});

describe("the Cloudinary configuration", () => {
	it("names the variable that is missing", () => {
		const error = (() => {
			try {
				cloudinaryConfigFromEnv({
					[CLOUDINARY_ENV_KEYS.cloudName]: "demo",
					[CLOUDINARY_ENV_KEYS.apiKey]: "key",
				});

				return undefined;
			} catch (caught) {
				return caught;
			}
		})();

		expect(error).toBeInstanceOf(CloudinaryConfigError);
		expect((error as CloudinaryConfigError).name).toBe("CloudinaryConfigError");
		expect((error as CloudinaryConfigError).missing).toEqual([CLOUDINARY_ENV_KEYS.apiSecret]);
		expect((error as CloudinaryConfigError).message).toContain(CLOUDINARY_ENV_KEYS.apiSecret);
	});

	it("treats a blank value as missing and names every one of them", () => {
		expect(() =>
			cloudinaryConfigFromEnv({
				[CLOUDINARY_ENV_KEYS.cloudName]: "  ",
				[CLOUDINARY_ENV_KEYS.apiKey]: "",
			}),
		).toThrowError(
			new RegExp(
				`${CLOUDINARY_ENV_KEYS.cloudName}.*${CLOUDINARY_ENV_KEYS.apiKey}`,
				"s",
			),
		);
	});

	it("refuses to build a provider without credentials and names the variable", () => {
		expect(() =>
			createCloudinaryProvider({ cloudName: "demo", apiKey: "key", apiSecret: " " }),
		).toThrowError(new CloudinaryConfigError([CLOUDINARY_ENV_KEYS.apiSecret]));
	});

	it("builds the three credentials from the environment it is given", () => {
		expect(
			cloudinaryConfigFromEnv({
				[CLOUDINARY_ENV_KEYS.cloudName]: " demo ",
				[CLOUDINARY_ENV_KEYS.apiKey]: "key",
				[CLOUDINARY_ENV_KEYS.apiSecret]: "secret",
				CLOUDINARY_UPLOAD_PRESET: "unused-preset",
			}),
		).toEqual({ cloudName: "demo", apiKey: "key", apiSecret: "secret" });
	});
});
