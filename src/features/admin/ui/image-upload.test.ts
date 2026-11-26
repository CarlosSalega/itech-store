import { describe, expect, it } from "vitest";

import { IMAGE_UPLOAD_LIMITS, imageErrorMessage } from "@/modules/image-uploads/core";

import {
	type SendRequest,
	SIGN_PATH,
	RECORD_PATH,
	uploadProductImage,
	UPLOAD_FAILED_MESSAGE,
} from "./image-upload";

const SIGNED = {
	signature: "c0ffee",
	timestamp: 1_760_000_000,
	apiKey: "123456789",
	cloudName: "itech",
	folder: "products/apple-ipad-pro",
	publicId: "8c1c2b",
	key: "products/apple-ipad-pro/8c1c2b",
	uploadUrl: "https://api.cloudinary.com/v1_1/itech/image/upload",
};

const UPLOADED_URL =
	"https://res.cloudinary.com/itech/image/upload/v1760000000/products/apple-ipad-pro/8c1c2b.webp";

type Call = { readonly url: string; readonly init: RequestInit | undefined };

type Step = (call: Call) => Response | Promise<Response>;

function json(body: unknown, status = 200): Response {
	return Response.json(body, { status });
}

function script(...steps: Step[]): { calls: Call[]; send: SendRequest } {
	const calls: Call[] = [];

	const send: SendRequest = async (url, init) => {
		const call = { url, init };
		calls.push(call);

		const step = steps[calls.length - 1];

		if (step === undefined) {
			throw new Error(`unscripted request ${calls.length}: ${url}`);
		}

		return step(call);
	};

	return { calls, send };
}

function imageFile(): File {
	return new File([new Uint8Array([1, 2, 3])], "foto.webp", { type: "image/webp" });
}

const HAPPY: readonly Step[] = [
	() => json(SIGNED),
	() => json({ secure_url: UPLOADED_URL, public_id: SIGNED.key }),
	() => json({ success: true, key: SIGNED.key, image: null }, 201),
];

describe("uploading a product photo", () => {
	it("signs, posts the file to the signed url and records it, in that order", async () => {
		const file = imageFile();
		const { calls, send } = script(...HAPPY);

		const uploaded = await uploadProductImage({
			file,
			scope: "apple-ipad-pro",
			productId: "prod_1",
			alt: "iPad Pro — foto principal",
			send,
		});

		expect(uploaded).toEqual({ key: SIGNED.key, url: UPLOADED_URL });
		expect(calls.map((call) => call.url)).toEqual([
			SIGN_PATH,
			SIGNED.uploadUrl,
			RECORD_PATH,
		]);

		expect(calls[0]?.init).toEqual({
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ productId: "apple-ipad-pro" }),
		});

		const cloudinary = calls[1]?.init;
		const form = cloudinary?.body;

		expect(cloudinary?.method).toBe("POST");
		expect(cloudinary?.headers).toBeUndefined();
		expect(form).toBeInstanceOf(FormData);
		expect([...(form as FormData).keys()].sort()).toEqual([
			"api_key",
			"file",
			"folder",
			"public_id",
			"signature",
			"timestamp",
		]);
		expect((form as FormData).get("file")).toBe(file);
		expect((form as FormData).get("api_key")).toBe(SIGNED.apiKey);
		expect((form as FormData).get("signature")).toBe(SIGNED.signature);
		expect((form as FormData).get("timestamp")).toBe(String(SIGNED.timestamp));
		expect((form as FormData).get("folder")).toBe(SIGNED.folder);
		expect((form as FormData).get("public_id")).toBe(SIGNED.publicId);

		expect(calls[2]?.init).toEqual({
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				key: SIGNED.key,
				url: UPLOADED_URL,
				productId: "prod_1",
				alt: "iPad Pro — foto principal",
			}),
		});
	});

	it("records without a product id while the product has no row", async () => {
		const { calls, send } = script(...HAPPY);

		await uploadProductImage({
			file: imageFile(),
			scope: "apple-ipad-pro",
			alt: "iPad Pro — foto principal",
			send,
		});

		expect(calls[2]?.init?.body).toBe(
			JSON.stringify({
				key: SIGNED.key,
				url: UPLOADED_URL,
				alt: "iPad Pro — foto principal",
			}),
		);
	});

	it("answers the module's sentence when the signature is refused, and asks for nothing else", async () => {
		const { calls, send } = script(() => json({ error: "No autorizado" }, 401));

		await expect(
			uploadProductImage({ file: imageFile(), scope: "apple-ipad-pro", alt: "iPad", send }),
		).rejects.toThrow("No autorizado");
		expect(calls).toHaveLength(1);
	});

	it("answers the module's sentence when the provider refuses the file", async () => {
		const { calls, send } = script(
			() => json(SIGNED),
			() => json({ error: { message: "Invalid Signature c0ffee" } }, 401),
		);

		await expect(
			uploadProductImage({ file: imageFile(), scope: "apple-ipad-pro", alt: "iPad", send }),
		).rejects.toThrow(UPLOAD_FAILED_MESSAGE);
		expect(calls).toHaveLength(2);
	});

	it("answers the recorded refusal's sentence when the record step refuses", async () => {
		const { calls, send } = script(...HAPPY.slice(0, 2), () =>
			json({ error: "Imagen no encontrada" }, 404),
		);

		await expect(
			uploadProductImage({ file: imageFile(), scope: "apple-ipad-pro", alt: "iPad", send }),
		).rejects.toThrow("Imagen no encontrada");
		expect(calls).toHaveLength(3);
	});

	it("answers the misconfiguration sentence when the signature comes back incomplete", async () => {
		const { calls, send } = script(() => json({ signature: "c0ffee" }));

		await expect(
			uploadProductImage({ file: imageFile(), scope: "apple-ipad-pro", alt: "iPad", send }),
		).rejects.toThrow(imageErrorMessage("MISCONFIGURED"));
		expect(calls).toHaveLength(1);
	});

	it("answers the same sentence when the network fails at any step", async () => {
		for (const failing of [0, 1, 2]) {
			const { send } = script(
				...HAPPY.map((step, index) =>
					index === failing
						? () => {
								throw new TypeError("Failed to fetch");
							}
						: step,
				),
			);

			await expect(
				uploadProductImage({ file: imageFile(), scope: "apple-ipad-pro", alt: "iPad", send }),
			).rejects.toThrow(UPLOAD_FAILED_MESSAGE);
		}
	});

	it("refuses a file that is not an image before it reaches the network", async () => {
		const { calls, send } = script();
		const pdf = new File([new Uint8Array([1])], "foto.pdf", { type: "application/pdf" });

		await expect(
			uploadProductImage({ file: pdf, scope: "apple-ipad-pro", alt: "iPad", send }),
		).rejects.toThrow(imageErrorMessage("INVALID_TYPE"));
		expect(calls).toHaveLength(0);
	});

	it("refuses an oversized file with the module's limit and its sentence", async () => {
		const { calls, send } = script();
		const huge = new File([new Uint8Array(IMAGE_UPLOAD_LIMITS.maxBytes + 1)], "foto.webp", {
			type: "image/webp",
		});

		await expect(
			uploadProductImage({ file: huge, scope: "apple-ipad-pro", alt: "iPad", send }),
		).rejects.toThrow(imageErrorMessage("TOO_LARGE"));
		expect(calls).toHaveLength(0);
	});

	it("checks the type before the size", async () => {
		const { send } = script();
		const oversizedPdf = new File([new Uint8Array(IMAGE_UPLOAD_LIMITS.maxBytes + 1)], "a.pdf", {
			type: "application/pdf",
		});

		await expect(
			uploadProductImage({ file: oversizedPdf, scope: "apple-ipad-pro", alt: "iPad", send }),
		).rejects.toThrow(imageErrorMessage("INVALID_TYPE"));
	});
});
