import { describe, expect, it, vi } from "vitest";

import { IMAGE_UPLOAD_LIMITS, validateParsedUpload, validateUploadFile } from "./index";
import type { UploadableFile } from "./index";

function makeFile(content: string, type = "image/png", name = "foto.png"): File {
	return new File([new TextEncoder().encode(content)], name, { type });
}

function declaredFile(size: number, type = "image/png", measured = size) {
	const arrayBuffer = vi.fn(async () => new ArrayBuffer(measured));
	const file: UploadableFile = { size, type, name: "foto.png", arrayBuffer };

	return { file, arrayBuffer };
}

describe("validateUploadFile", () => {
	it("refuses a missing or non-file value as NO_FILE", () => {
		expect(validateUploadFile(null)).toMatchObject({ ok: false, code: "NO_FILE" });
		expect(validateUploadFile(undefined)).toMatchObject({ ok: false, code: "NO_FILE" });
		expect(validateUploadFile("string")).toMatchObject({ ok: false, code: "NO_FILE" });
		expect(validateUploadFile({})).toMatchObject({ ok: false, code: "NO_FILE" });
		expect(validateUploadFile({ size: 1, type: "image/png" })).toMatchObject({
			ok: false,
			code: "NO_FILE",
		});
	});

	it("refuses an empty file as NO_FILE", () => {
		expect(validateUploadFile(new File([], "vacia.png", { type: "image/png" }))).toMatchObject({
			ok: false,
			code: "NO_FILE",
		});
		expect(validateUploadFile(declaredFile(0).file)).toMatchObject({ ok: false, code: "NO_FILE" });
	});

	it("accepts each format the limits allow and reports the file back", () => {
		const file = makeFile("x", "image/png");
		const result = validateUploadFile(file);

		expect(result.ok).toBe(true);
		expect(result.ok && result.file).toBe(file);

		for (const type of IMAGE_UPLOAD_LIMITS.allowedMimeTypes) {
			expect(validateUploadFile(makeFile("x", type)).ok).toBe(true);
		}
	});

	it("refuses a type outside the allow-list as INVALID_TYPE", () => {
		const accepted = IMAGE_UPLOAD_LIMITS.allowedMimeTypes;

		expect(validateUploadFile(makeFile("x", "application/pdf"))).toEqual({
			ok: false,
			code: "INVALID_TYPE",
			details: { type: "application/pdf", accepted },
		});
		expect(validateUploadFile(makeFile("x", "image/svg+xml"))).toMatchObject({
			ok: false,
			code: "INVALID_TYPE",
		});
		expect(validateUploadFile(makeFile("x", "image/gif"))).toMatchObject({
			ok: false,
			code: "INVALID_TYPE",
		});
	});

	it("refuses a file with no declared type", () => {
		expect(validateUploadFile(makeFile("x", ""))).toMatchObject({ ok: false, code: "INVALID_TYPE" });
	});

	it("decides the type before the size", () => {
		const oversized = declaredFile(50 * 1024 * 1024, "application/pdf");

		expect(validateUploadFile(oversized.file)).toMatchObject({
			ok: false,
			code: "INVALID_TYPE",
		});
	});

	it("treats the byte limit as an inclusive maximum", () => {
		const file = makeFile("1234");

		expect(validateUploadFile(file, { maxBytes: 4 }).ok).toBe(true);
		expect(validateUploadFile(file, { maxBytes: 3 })).toMatchObject({
			ok: false,
			code: "TOO_LARGE",
		});
	});

	it("reports the declared size and the limit when too large", () => {
		expect(validateUploadFile(makeFile("12345"), { maxBytes: 2 })).toEqual({
			ok: false,
			code: "TOO_LARGE",
			details: { size: 5, maxBytes: 2 },
		});
	});

	it("compares media types case-insensitively", () => {
		expect(validateUploadFile(makeFile("x", "IMAGE/PNG")).ok).toBe(true);
		expect(validateUploadFile(makeFile("x", "IMAGE/SVG+XML")).ok).toBe(false);
	});

	it("takes its defaults from the limits constant", () => {
		expect(validateUploadFile(declaredFile(IMAGE_UPLOAD_LIMITS.maxBytes).file).ok).toBe(true);
		expect(validateUploadFile(declaredFile(IMAGE_UPLOAD_LIMITS.maxBytes + 1).file)).toMatchObject({
			ok: false,
			code: "TOO_LARGE",
			details: { size: IMAGE_UPLOAD_LIMITS.maxBytes + 1, maxBytes: IMAGE_UPLOAD_LIMITS.maxBytes },
		});
		expect(validateUploadFile(makeFile("x", "image/bmp"))).toMatchObject({
			ok: false,
			code: "INVALID_TYPE",
		});
	});

	it("lets a caller replace the limits without changing the defaults", () => {
		const policy = { allowedMimeTypes: ["image/gif"], maxBytes: 1 };

		expect(validateUploadFile(makeFile("x", "image/gif"), policy).ok).toBe(true);
		expect(validateUploadFile(makeFile("xx", "image/gif"), policy)).toMatchObject({
			ok: false,
			code: "TOO_LARGE",
		});
		expect(validateUploadFile(makeFile("x", "image/png"), policy)).toEqual({
			ok: false,
			code: "INVALID_TYPE",
			details: { type: "image/png", accepted: ["image/gif"] },
		});
		expect(validateUploadFile(makeFile("x", "image/png")).ok).toBe(true);
		expect(IMAGE_UPLOAD_LIMITS.allowedMimeTypes).toContain("image/png");
	});
});

describe("validateParsedUpload", () => {
	it("refuses a missing file before reading any bytes", async () => {
		await expect(validateParsedUpload(null)).resolves.toMatchObject({
			ok: false,
			code: "NO_FILE",
		});
	});

	it("refuses an empty file before reading any bytes", async () => {
		const empty = declaredFile(0);

		await expect(validateParsedUpload(empty.file)).resolves.toMatchObject({
			ok: false,
			code: "NO_FILE",
		});
		expect(empty.arrayBuffer).not.toHaveBeenCalled();
	});

	it("refuses an oversized non-image as a type error", async () => {
		const pdf = declaredFile(50 * 1024 * 1024, "application/pdf");

		const result = await validateParsedUpload(pdf.file);

		expect(result).toMatchObject({ ok: false, code: "INVALID_TYPE" });
		expect(pdf.arrayBuffer).not.toHaveBeenCalled();
	});

	it("refuses a declaration over the limit without reading the bytes", async () => {
		const file = declaredFile(5, "image/png");

		await expect(validateParsedUpload(file.file, { maxBytes: 4 })).resolves.toEqual({
			ok: false,
			code: "TOO_LARGE",
			details: { size: 5, maxBytes: 4 },
		});
		expect(file.arrayBuffer).not.toHaveBeenCalled();
	});

	it("accepts a file that arrives with the size it declared", async () => {
		const { file, arrayBuffer } = declaredFile(4, "image/png");

		const result = await validateParsedUpload(file, { maxBytes: 4 });

		expect(result).toEqual({ ok: true, file });
		expect(arrayBuffer).toHaveBeenCalledTimes(1);
	});

	it("rejects a file that grows past the limit after parsing", async () => {
		const { file } = declaredFile(4, "image/png", 5);

		await expect(validateParsedUpload(file, { maxBytes: 4 })).resolves.toEqual({
			ok: false,
			code: "TOO_LARGE",
			details: { size: 5, maxBytes: 4, declaredSize: 4 },
		});
	});

	it("accepts a file that grows to exactly the limit", async () => {
		const { file } = declaredFile(3, "image/png", 4);

		await expect(validateParsedUpload(file, { maxBytes: 4 })).resolves.toEqual({ ok: true, file });
	});

	it("applies the defaults from the constant when no policy arrives", async () => {
		const atLimit = declaredFile(IMAGE_UPLOAD_LIMITS.maxBytes).file;
		const grown = declaredFile(
			IMAGE_UPLOAD_LIMITS.maxBytes,
			"image/png",
			IMAGE_UPLOAD_LIMITS.maxBytes + 1,
		).file;

		await expect(validateParsedUpload(atLimit)).resolves.toEqual({ ok: true, file: atLimit });
		await expect(validateParsedUpload(grown)).resolves.toMatchObject({
			ok: false,
			code: "TOO_LARGE",
			details: { maxBytes: IMAGE_UPLOAD_LIMITS.maxBytes },
		});
	});
});
