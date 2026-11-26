import { describe, expect, it, vi } from "vitest";

import type { ImageErrorCode } from "../core/errors";
import { ImageError, IMAGE_ERROR_STATUS } from "../core/errors";
import { imageErrorMessage } from "../core/messages";
import type { DeleteResult } from "../core/types";
import type { GuardActor, GuardSession } from "../guards/types";
import type { AuthorizeUploadDelete, RecordUpload } from "./upload-handler";
import { createUploadHandler } from "./upload-handler";

const ADMIN_SESSION: GuardSession = { user: { id: "admin-1", role: "ADMIN" } };
const CUSTOMER_SESSION: GuardSession = { user: { id: "customer-1", role: "CUSTOMER" } };
const ANONYMOUS: GuardSession = null;

const KEY = "products/product-1/foto";
const URL_TEXT = "https://res.cloudinary.com/demo/image/upload/v1/products/product-1/foto.jpg";
const IMAGE = { id: "image-1", position: 2, alt: "iPhone 17 — foto 3", url: URL_TEXT };
const FORBIDDEN_SENTENCE =
	"No tienes permiso para eliminar esta imagen: pertenece al producto «MacBook Air».";

function body(value: unknown) {
	const json = vi.fn(async () => value);

	return { json, request: { json } };
}

type ForgetUpload = (args: { readonly actor: GuardActor; readonly key: string }) => Promise<void>;

function harness(
	options: {
		session?: GuardSession;
		record?: RecordUpload;
		authorizeDelete?: AuthorizeUploadDelete | null;
		deleted?: () => Promise<DeleteResult>;
		forget?: ForgetUpload;
	} = {},
) {
	const record = options.record ?? vi.fn<RecordUpload>(async () => ({ image: null }));
	const remove = options.deleted ?? vi.fn(async (): Promise<DeleteResult> => ({ success: true }));
	const authorizeDelete =
		options.authorizeDelete ?? vi.fn<AuthorizeUploadDelete>(async () => ({ allowed: true }));
	const forget = vi.fn<ForgetUpload>(options.forget ?? (async () => {}));

	const handler = createUploadHandler({
		getSession: async () => (options.session === undefined ? ADMIN_SESSION : options.session),
		getProvider: () => ({ delete: remove }),
		record,
		...(options.authorizeDelete === null ? {} : { authorizeDelete }),
		forget,
	});

	return { handler, record, remove, authorizeDelete, forget };
}

describe("recording an upload that succeeded", () => {
	it("refuses an anonymous request before the body, the recorder and the provider", async () => {
		const { handler, record, remove, forget } = harness({ session: ANONYMOUS });
		const { json, request } = body({ key: KEY, url: URL_TEXT });

		const response = await handler.POST(request);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: imageErrorMessage("UNAUTHENTICATED") });
		expect(json).not.toHaveBeenCalled();
		expect(record).not.toHaveBeenCalled();
		expect(remove).not.toHaveBeenCalled();
		expect(forget).not.toHaveBeenCalled();
	});

	it("refuses a signed-in request that is not an admin before anything else", async () => {
		const { handler, record } = harness({ session: CUSTOMER_SESSION });
		const { json, request } = body({ key: KEY, url: URL_TEXT });

		const response = await handler.POST(request);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: imageErrorMessage("FORBIDDEN") });
		expect(json).not.toHaveBeenCalled();
		expect(record).not.toHaveBeenCalled();
	});

	it("answers 201 with the row it wrote", async () => {
		const write = vi.fn<RecordUpload>(async () => ({ image: IMAGE }));
		const { handler } = harness({ record: write });
		const { request } = body({
			key: KEY,
			url: URL_TEXT,
			productId: "product-1",
			alt: "iPhone 17 — foto 3",
		});

		const response = await handler.POST(request);

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ success: true, key: KEY, image: IMAGE });
		expect(write).toHaveBeenCalledWith({
			actor: { id: "admin-1", role: "ADMIN" },
			key: KEY,
			url: URL_TEXT,
			productId: "product-1",
			alt: "iPhone 17 — foto 3",
		});
	});

	it("records an asset with no product as a gallery-less upload", async () => {
		const write = vi.fn<RecordUpload>(async () => ({ image: null }));
		const { handler } = harness({ record: write });
		const { request } = body({ key: KEY, url: URL_TEXT });

		const response = await handler.POST(request);

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({ success: true, key: KEY, image: null });
		expect(write).toHaveBeenCalledWith({
			actor: { id: "admin-1", role: "ADMIN" },
			key: KEY,
			url: URL_TEXT,
			productId: null,
			alt: null,
		});
	});

	it("answers 400 without a key", async () => {
		const { handler, record } = harness();
		const { request } = body({ url: URL_TEXT });

		const response = await handler.POST(request);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: imageErrorMessage("MISSING_KEY") });
		expect(record).not.toHaveBeenCalled();
	});

	it("answers 400 without a url", async () => {
		const { handler, record } = harness();
		const { request } = body({ key: KEY });

		const response = await handler.POST(request);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: imageErrorMessage("MISSING_KEY") });
		expect(record).not.toHaveBeenCalled();
	});

	it("reads a body that is not JSON as a missing key", async () => {
		const { handler } = harness();
		const response = await handler.POST({
			json: async () => {
				throw new SyntaxError("Unexpected token");
			},
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: imageErrorMessage("MISSING_KEY") });
	});

	it.each(Object.keys(IMAGE_ERROR_STATUS) as ImageErrorCode[])(
		"maps a %s from the recorder onto its own status",
		async (code) => {
			const write = vi.fn<RecordUpload>(async () => {
				throw new ImageError(code);
			});
			const { handler } = harness({ record: write });
			const { request } = body({ key: KEY, url: URL_TEXT });

			const response = await handler.POST(request);

			expect(response.status).toBe(IMAGE_ERROR_STATUS[code]);
			expect(await response.json()).toEqual({ error: imageErrorMessage(code) });
		},
	);

	it("answers UPLOAD_FAILED when the recorder throws something without a code", async () => {
		const write = vi.fn<RecordUpload>(async () => {
			throw new Error("connection refused");
		});
		const { handler } = harness({ record: write });
		const { request } = body({ key: KEY, url: URL_TEXT });

		const response = await handler.POST(request);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: imageErrorMessage("UPLOAD_FAILED") });
	});
});

describe("deleting a key", () => {
	it("refuses an anonymous request before the body and the provider", async () => {
		const { handler, remove, authorizeDelete } = harness({ session: ANONYMOUS });
		const { json, request } = body({ key: KEY });

		const response = await handler.DELETE(request);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: imageErrorMessage("UNAUTHENTICATED") });
		expect(json).not.toHaveBeenCalled();
		expect(authorizeDelete).not.toHaveBeenCalled();
		expect(remove).not.toHaveBeenCalled();
	});

	it("refuses a signed-in request that is not an admin before anything else", async () => {
		const { handler, remove } = harness({ session: CUSTOMER_SESSION });
		const { json, request } = body({ key: KEY });

		const response = await handler.DELETE(request);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: imageErrorMessage("FORBIDDEN") });
		expect(json).not.toHaveBeenCalled();
		expect(remove).not.toHaveBeenCalled();
	});

	it("answers 400 without a key", async () => {
		const { handler, remove } = harness();
		const { request } = body({});

		const response = await handler.DELETE(request);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: imageErrorMessage("MISSING_KEY") });
		expect(remove).not.toHaveBeenCalled();
	});

	it("refuses a key the ownership rule does not allow, with the guard's sentence", async () => {
		const { handler, remove, forget } = harness({
			authorizeDelete: async () => ({
				allowed: false,
				reason: "OTHER_PRODUCT",
				message: FORBIDDEN_SENTENCE,
			}),
		});
		const { request } = body({ key: KEY, productId: "product-1" });

		const response = await handler.DELETE(request);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: FORBIDDEN_SENTENCE });
		expect(remove).not.toHaveBeenCalled();
		expect(forget).not.toHaveBeenCalled();
	});

	it("hands the product from the body to the authorizer", async () => {
		const authorizeDelete = vi.fn<AuthorizeUploadDelete>(async () => ({ allowed: true }));
		const { handler } = harness({ authorizeDelete });
		const { request } = body({ key: KEY, productId: "product-1" });

		await handler.DELETE(request);

		expect(authorizeDelete).toHaveBeenCalledWith({
			actor: { id: "admin-1", role: "ADMIN" },
			key: KEY,
			productId: "product-1",
		});
	});

	it("fails closed when no authorizer is configured", async () => {
		const { handler, remove } = harness({ authorizeDelete: null });
		const { request } = body({ key: KEY });

		const response = await handler.DELETE(request);

		expect(response.status).toBe(403);
		expect(remove).not.toHaveBeenCalled();
	});

	it("deletes the asset, forgets the record and answers with the key", async () => {
		const { handler, remove, forget } = harness();
		const { request } = body({ key: KEY });

		const response = await handler.DELETE(request);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true, key: KEY });
		expect(remove).toHaveBeenCalledWith(KEY);
		expect(forget).toHaveBeenCalledWith({ actor: { id: "admin-1", role: "ADMIN" }, key: KEY });
	});

	it("answers DELETE_FAILED when the provider reports a failure", async () => {
		const { handler, forget } = harness({
			deleted: async () => ({ success: false, code: "DELETE_FAILED" }),
		});
		const { request } = body({ key: KEY });

		const response = await handler.DELETE(request);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: imageErrorMessage("DELETE_FAILED") });
		expect(forget).not.toHaveBeenCalled();
	});

	it("answers success when forgetting the record fails, because the asset is gone", async () => {
		const { handler } = harness({
			forget: async () => {
				throw new Error("database is down");
			},
		});
		const { request } = body({ key: KEY });

		const response = await handler.DELETE(request);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true, key: KEY });
	});
});
