import { describe, expect, it, vi } from "vitest";

import { ImageError } from "../core/errors";
import { imageErrorMessage } from "../core/messages";
import type { GuardSession } from "../guards/types";
import type { SignedUpload, SignUploadRequest } from "../provider/cloudinary";
import { CloudinaryConfigError } from "../provider/cloudinary";
import { createSignHandler } from "./sign-handler";

const ADMIN_SESSION: GuardSession = { user: { id: "admin-1", role: "ADMIN" } };
const CUSTOMER_SESSION: GuardSession = { user: { id: "customer-1", role: "CUSTOMER" } };

const SIGNED: SignedUpload = {
	signature: "0123456789abcdef",
	timestamp: 1_700_000_000,
	apiKey: "api-key",
	cloudName: "demo",
	folder: "products/product-1",
	publicId: "foto",
	key: "products/product-1/foto",
	uploadUrl: "https://api.cloudinary.com/v1_1/demo/image/upload",
};

function body(value: unknown) {
	const json = vi.fn(async () => value);

	return { json, request: { json } };
}

function harness(
	options: {
		session?: GuardSession;
		sign?: (request: SignUploadRequest) => SignedUpload;
	} = {},
) {
	const signUpload = vi.fn(options.sign ?? (() => SIGNED));
	const getProvider = vi.fn(() => ({ signUpload }));

	const handler = createSignHandler({
		getSession: async () => (options.session === undefined ? ADMIN_SESSION : options.session),
		getProvider,
	});

	return { handler, signUpload, getProvider };
}

describe("the signature the browser uploads with", () => {
	it("refuses an anonymous request before the body and the provider", async () => {
		const { handler, getProvider } = harness({ session: null });
		const { json, request } = body({ productId: "product-1" });

		const response = await handler.POST(request);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: imageErrorMessage("UNAUTHENTICATED") });
		expect(json).not.toHaveBeenCalled();
		expect(getProvider).not.toHaveBeenCalled();
	});

	it("refuses a signed-in request that is not an admin before anything else", async () => {
		const { handler, getProvider } = harness({ session: CUSTOMER_SESSION });
		const { json, request } = body({ productId: "product-1" });

		const response = await handler.POST(request);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: imageErrorMessage("FORBIDDEN") });
		expect(json).not.toHaveBeenCalled();
		expect(getProvider).not.toHaveBeenCalled();
	});

	it("answers with everything the browser needs to post the file", async () => {
		const { handler, signUpload } = harness();
		const { request } = body({ productId: "product-1" });

		const response = await handler.POST(request);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(SIGNED);
		expect(signUpload).toHaveBeenCalledWith({ scope: { productId: "product-1" } });
	});

	it("signs a store scope and the public id the caller chose", async () => {
		const { handler, signUpload } = harness();
		const { request } = body({ storeId: "store-1", publicId: "portada" });

		await handler.POST(request);

		expect(signUpload).toHaveBeenCalledWith({
			scope: { storeId: "store-1" },
			publicId: "portada",
		});
	});

	it("answers 400 when the body names no scope", async () => {
		const { handler, signUpload } = harness();
		const { request } = body({});

		const response = await handler.POST(request);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: imageErrorMessage("MISSING_KEY") });
		expect(signUpload).not.toHaveBeenCalled();
	});

	it.each([
		["an image error", () => new ImageError("MISSING_KEY"), 400],
		["a missing credential", () => new CloudinaryConfigError(["CLOUDINARY_API_KEY"]), 500],
	] as const)("maps %s onto its own status", async (_label, thrown, status) => {
		const { handler } = harness({
			sign: () => {
				throw thrown();
			},
		});
		const { request } = body({ productId: "product-1" });

		const response = await handler.POST(request);

		expect(response.status).toBe(status);
	});

	it("answers MISCONFIGURED when the provider cannot be built", async () => {
		const handler = createSignHandler({
			getSession: async () => ADMIN_SESSION,
			getProvider: () => {
				throw new CloudinaryConfigError(["CLOUDINARY_API_SECRET"]);
			},
		});
		const { request } = body({ productId: "product-1" });

		const response = await handler.POST(request);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: imageErrorMessage("MISCONFIGURED") });
	});
});
