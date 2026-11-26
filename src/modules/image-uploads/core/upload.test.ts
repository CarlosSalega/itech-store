import { describe, expect, it, vi } from "vitest";

import { ImageError, imageErrorMessage, uploadImage } from "./index";
import type {
	DeleteManyResult,
	DeleteResult,
	ImageProvider,
	UploadableFile,
	UploadResult,
} from "./index";

const STORED: UploadResult = {
	key: "products/foto",
	url: "https://res.cloudinary.com/demo/image/upload/products/foto",
};

function fakeProvider() {
	const upload = vi.fn(async (): Promise<UploadResult> => STORED);
	const remove = vi.fn(async (): Promise<DeleteResult> => ({ success: true }));
	const removeMany = vi.fn(async (): Promise<DeleteManyResult> => ({ successful: 0, failed: 0 }));
	const provider: ImageProvider = { upload, delete: remove, deleteMany: removeMany };

	return { provider, upload };
}

function makeFile(content: string, type = "image/png", name = "foto.png"): File {
	return new File([new TextEncoder().encode(content)], name, { type });
}

describe("uploadImage", () => {
	it("never reaches the provider with a type outside the allow-list", async () => {
		const { provider, upload } = fakeProvider();

		await expect(uploadImage(provider, makeFile("x", "application/pdf"))).rejects.toBeInstanceOf(
			ImageError,
		);
		expect(upload).not.toHaveBeenCalled();
	});

	it("never reaches the provider with an oversized image", async () => {
		const { provider, upload } = fakeProvider();

		await expect(
			uploadImage(provider, makeFile("12345"), { policy: { maxBytes: 4 } }),
		).rejects.toMatchObject({ code: "TOO_LARGE", details: { size: 5, maxBytes: 4 } });
		expect(upload).not.toHaveBeenCalled();
	});

	it("never reaches the provider with an oversized non-image", async () => {
		const { provider, upload } = fakeProvider();

		await expect(
			uploadImage(provider, makeFile("12345", "application/pdf"), {
				policy: { maxBytes: 1, allowedMimeTypes: ["image/png"] },
			}),
		).rejects.toMatchObject({ code: "INVALID_TYPE" });
		expect(upload).not.toHaveBeenCalled();
	});

	it("never reaches the provider with a missing or an empty file", async () => {
		const { provider, upload } = fakeProvider();

		await expect(uploadImage(provider, undefined)).rejects.toMatchObject({ code: "NO_FILE" });
		await expect(
			uploadImage(provider, new File([], "vacia.png", { type: "image/png" })),
		).rejects.toMatchObject({ code: "NO_FILE" });
		expect(upload).not.toHaveBeenCalled();
	});

	it("never reaches the provider with a file that grows past the limit after parsing", async () => {
		const { provider, upload } = fakeProvider();
		const arrayBuffer = vi.fn(async () => new ArrayBuffer(5));
		const file: UploadableFile = { size: 4, type: "image/png", arrayBuffer };

		await expect(uploadImage(provider, file, { policy: { maxBytes: 4 } })).rejects.toMatchObject({
			code: "TOO_LARGE",
			details: { size: 5, maxBytes: 4, declaredSize: 4 },
		});
		expect(upload).not.toHaveBeenCalled();
	});

	it("fails with a code and leaves the sentence to the mapper", async () => {
		const { provider } = fakeProvider();

		const failure = await uploadImage(provider, makeFile("x", "application/pdf")).catch(
			(error: unknown) => error,
		);

		expect(failure).toBeInstanceOf(ImageError);
		expect((failure as ImageError).code).toBe("INVALID_TYPE");
		expect((failure as ImageError).message).toBe("INVALID_TYPE");
		expect(imageErrorMessage((failure as ImageError).code)).toBe("El archivo debe ser una imagen");
	});

	it("stores an accepted image and returns the provider result untouched", async () => {
		const { provider, upload } = fakeProvider();
		const file = makeFile("x", "image/webp");

		await expect(uploadImage(provider, file)).resolves.toBe(STORED);
		expect(upload).toHaveBeenCalledWith(file, undefined);
	});

	it("passes the upload options through", async () => {
		const { provider, upload } = fakeProvider();
		const file = makeFile("x");
		const options = { folder: "products", tags: ["catalogo"] };

		await expect(uploadImage(provider, file, { upload: options })).resolves.toBe(STORED);
		expect(upload).toHaveBeenCalledWith(file, options);
	});

	it("honours a policy that replaces the defaults", async () => {
		const { provider } = fakeProvider();
		const policy = { allowedMimeTypes: ["image/gif"] };

		await expect(uploadImage(provider, makeFile("x", "image/gif"), { policy })).resolves.toBe(STORED);
		await expect(uploadImage(provider, makeFile("x", "image/gif"))).rejects.toMatchObject({
			code: "INVALID_TYPE",
		});
	});

	it("propagates a provider failure as it arrived", async () => {
		const { provider, upload } = fakeProvider();
		const failure = new ImageError("UPLOAD_FAILED", { details: { upstream: "eager" } });
		upload.mockRejectedValueOnce(failure);

		await expect(uploadImage(provider, makeFile("x"))).rejects.toBe(failure);
	});
});
