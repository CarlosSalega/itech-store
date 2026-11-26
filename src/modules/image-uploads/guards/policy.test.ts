import { describe, expect, it, vi } from "vitest";

import { IMAGE_UPLOAD_LIMITS } from "../core/limits";
import type { ImageProvider } from "../core/types";
import { forbiddenMessage } from "./copy";
import { guardDelete, guardUpload, evaluateAuthentication, evaluateDelete, evaluateUploadFile } from "./policy";
import type { AuthorizeDelete, GuardSession } from "./types";

const adminSession: GuardSession = { user: { id: "admin-1", role: "ADMIN" } };
const actor = { id: "admin-1", role: "ADMIN" } as const;
const other = { id: "product-2", name: "MacBook Air" };
const KEY = "products/product-1/photo";

function makeFile(type = "image/png", content = "x"): File {
	return new File([new TextEncoder().encode(content)], "photo.png", { type });
}

function plainFile(size: number, type = "image/png") {
	return { size, type, arrayBuffer: async () => new ArrayBuffer(size) };
}

function trackingFile(type = "image/png") {
	const touched: string[] = [];

	return {
		touched,
		file: {
			get size() {
				touched.push("size");
				return 4;
			},
			get type() {
				touched.push("type");
				return type;
			},
			arrayBuffer() {
				touched.push("arrayBuffer");
				return Promise.resolve(new ArrayBuffer(4));
			},
		},
	};
}

function makeProvider(): ImageProvider {
	return {
		upload: vi.fn(async () => ({ key: "products/product-1/photo", url: "https://cdn/x.png" })),
		delete: vi.fn(async () => ({ success: true as const })),
		deleteMany: vi.fn(async () => ({ successful: 0, failed: 0 })),
	};
}

describe("evaluateAuthentication", () => {
	it("returns the actor for an ADMIN session", () => {
		expect(
			evaluateAuthentication({
				user: { id: "admin-1", role: "ADMIN", name: "Ana", email: "ana@example.com" },
			}),
		).toEqual({ ok: true, actor: { id: "admin-1", role: "ADMIN" } });
	});

	it("refuses a request with no session", () => {
		expect(evaluateAuthentication(null)).toEqual({ ok: false, code: "UNAUTHENTICATED" });
		expect(evaluateAuthentication(undefined)).toEqual({ ok: false, code: "UNAUTHENTICATED" });
		expect(evaluateAuthentication({})).toEqual({ ok: false, code: "UNAUTHENTICATED" });
		expect(evaluateAuthentication({ user: null })).toEqual({
			ok: false,
			code: "UNAUTHENTICATED",
		});
	});

	it("refuses a session without a usable id", () => {
		expect(evaluateAuthentication({ user: { id: "", role: "ADMIN" } })).toEqual({
			ok: false,
			code: "UNAUTHENTICATED",
		});
		expect(evaluateAuthentication({ user: { role: "ADMIN" } })).toEqual({
			ok: false,
			code: "UNAUTHENTICATED",
		});
		expect(
			evaluateAuthentication({ user: { id: 42 as unknown as string, role: "ADMIN" } }),
		).toEqual({ ok: false, code: "UNAUTHENTICATED" });
	});

	it("refuses a signed-in user who is not an admin", () => {
		for (const role of ["CUSTOMER", "admin", "ADMIN ", "", undefined, null]) {
			expect(evaluateAuthentication({ user: { id: "user-1", role } })).toEqual({
				ok: false,
				code: "FORBIDDEN",
			});
		}
	});

	it("refuses with a code and no sentence", () => {
		const decision = evaluateAuthentication({ user: { id: "user-1", role: "CUSTOMER" } });

		expect(decision.ok).toBe(false);
		expect(decision.ok === false && decision.message).toBeUndefined();
		expect("file" in decision).toBe(false);
	});
});

describe("evaluateUploadFile", () => {
	it("returns the accepted file", () => {
		const file = makeFile();
		const decision = evaluateUploadFile(file);

		expect(decision.ok).toBe(true);
		expect(decision.ok && decision.file).toBe(file);
	});

	it("carries the rejection code and details through", () => {
		expect(evaluateUploadFile(null)).toEqual({
			ok: false,
			code: "NO_FILE",
			details: { received: "null" },
		});
		expect(evaluateUploadFile(makeFile("application/pdf"))).toEqual({
			ok: false,
			code: "INVALID_TYPE",
			details: {
				type: "application/pdf",
				accepted: [...IMAGE_UPLOAD_LIMITS.allowedMimeTypes],
			},
		});
		expect(evaluateUploadFile(plainFile(5), { maxBytes: 2 })).toEqual({
			ok: false,
			code: "TOO_LARGE",
			details: { size: 5, maxBytes: 2 },
		});
	});

	it("surfaces the svg rejection identically", () => {
		expect(evaluateUploadFile(makeFile("image/svg+xml"))).toEqual({
			ok: false,
			code: "INVALID_TYPE",
			details: {
				type: "image/svg+xml",
				accepted: [...IMAGE_UPLOAD_LIMITS.allowedMimeTypes],
			},
		});
	});

	it("enforces the documented limit when no policy is supplied", () => {
		expect(evaluateUploadFile(plainFile(IMAGE_UPLOAD_LIMITS.maxBytes))).toEqual({
			ok: true,
			file: expect.objectContaining({ size: IMAGE_UPLOAD_LIMITS.maxBytes }),
		});
		expect(evaluateUploadFile(plainFile(IMAGE_UPLOAD_LIMITS.maxBytes + 1))).toEqual({
			ok: false,
			code: "TOO_LARGE",
			details: {
				size: IMAGE_UPLOAD_LIMITS.maxBytes + 1,
				maxBytes: IMAGE_UPLOAD_LIMITS.maxBytes,
			},
		});
	});

	it("takes the accepted types from a supplied policy", () => {
		expect(
			evaluateUploadFile(makeFile("image/gif"), {
				allowedMimeTypes: ["image/gif"],
				maxBytes: 1024,
			}),
		).toEqual({ ok: true, file: expect.objectContaining({ type: "image/gif" }) });
	});
});

describe("evaluateDelete", () => {
	it("fails closed when no authorizer is supplied", async () => {
		const decision = await evaluateDelete({ actor, key: KEY });

		expect(decision).toEqual({
			ok: false,
			code: "FORBIDDEN",
			details: { cause: "authorizeDelete is not configured" },
		});
		expect("reason" in decision).toBe(false);
		expect("message" in decision).toBe(false);
	});

	it("allows when the authorizer allows", async () => {
		await expect(
			evaluateDelete({ actor, key: KEY, authorizeDelete: () => ({ allowed: true }) }),
		).resolves.toEqual({ ok: true });
	});

	it("forwards the actor and the key to the authorizer", async () => {
		const authorizeDelete = vi.fn(() => ({ allowed: true as const }));

		await evaluateDelete({ actor, key: KEY, authorizeDelete });

		expect(authorizeDelete).toHaveBeenCalledWith({ actor, key: KEY });
	});

	it("returns the reason and the copy so the transport can answer", async () => {
		const message = forbiddenMessage("OTHER_PRODUCT", other);

		await expect(
			evaluateDelete({
				actor,
				key: KEY,
				authorizeDelete: () => ({ allowed: false, reason: "OTHER_PRODUCT", message }),
			}),
		).resolves.toEqual({ ok: false, code: "FORBIDDEN", reason: "OTHER_PRODUCT", message });
	});

	it("denies without inventing a reason when the authorizer gives none", async () => {
		const authorizeDelete = (() => ({ allowed: false })) as unknown as AuthorizeDelete;
		const decision = await evaluateDelete({ actor, key: KEY, authorizeDelete });

		expect(decision).toEqual({ ok: false, code: "FORBIDDEN" });
		expect("reason" in decision).toBe(false);
	});

	it("denies instead of crashing when the authorizer throws", async () => {
		await expect(
			evaluateDelete({
				actor,
				key: KEY,
				authorizeDelete: () => {
					throw new Error("database down");
				},
			}),
		).resolves.toEqual({
			ok: false,
			code: "FORBIDDEN",
			details: { error: "database down" },
		});
	});
});

describe("guardUpload", () => {
	it("refuses an unauthenticated request before the file is looked at", () => {
		const { file, touched } = trackingFile();

		for (const session of [null, {}, { user: { id: "", role: "ADMIN" } }, undefined]) {
			const decision = guardUpload({ session, file });

			expect(decision).toEqual({ ok: false, code: "UNAUTHENTICATED" });
		}

		expect(touched).toEqual([]);
	});

	it("refuses a non-admin before the file is looked at", () => {
		const { file, touched } = trackingFile();

		expect(guardUpload({ session: { user: { id: "user-1", role: "CUSTOMER" } }, file })).toEqual({
			ok: false,
			code: "FORBIDDEN",
		});
		expect(touched).toEqual([]);
	});

	it("refuses an invalid file so it never reaches the provider", async () => {
		const provider = makeProvider();
		const decision = guardUpload({ session: adminSession, file: makeFile("application/pdf") });

		expect(decision).toEqual({
			ok: false,
			code: "INVALID_TYPE",
			details: {
				type: "application/pdf",
				accepted: [...IMAGE_UPLOAD_LIMITS.allowedMimeTypes],
			},
		});
		expect("file" in decision).toBe(false);

		if (decision.ok) await provider.upload(decision.file);

		expect(provider.upload).not.toHaveBeenCalled();
	});

	it("refuses an oversized file so it never reaches the provider", async () => {
		const provider = makeProvider();
		const decision = guardUpload({
			session: adminSession,
			file: plainFile(IMAGE_UPLOAD_LIMITS.maxBytes + 1),
		});

		expect(decision.ok).toBe(false);
		expect(decision.ok === false && decision.code).toBe("TOO_LARGE");

		if (decision.ok) await provider.upload(decision.file);

		expect(provider.upload).not.toHaveBeenCalled();
	});

	it("accepts an admin with a valid file and returns the actor", () => {
		const file = makeFile();

		expect(guardUpload({ session: adminSession, file })).toEqual({
			ok: true,
			actor: { id: "admin-1", role: "ADMIN" },
			file,
		});
	});

	it("takes the validation policy it is given", () => {
		const file = plainFile(5);

		expect(guardUpload({ session: adminSession, file, policy: { maxBytes: 2 } })).toEqual({
			ok: false,
			code: "TOO_LARGE",
			details: { size: 5, maxBytes: 2 },
		});
	});
});

describe("guardDelete", () => {
	it("refuses an unauthenticated request before the authorizer is consulted", async () => {
		const authorizeDelete = vi.fn(() => ({ allowed: true as const }));

		for (const session of [null, {}, { user: { id: "", role: "ADMIN" } }, undefined]) {
			await expect(guardDelete({ session, key: KEY, authorizeDelete })).resolves.toEqual({
				ok: false,
				code: "UNAUTHENTICATED",
			});
		}

		expect(authorizeDelete).not.toHaveBeenCalled();
	});

	it("refuses a non-admin before the authorizer is consulted", async () => {
		const authorizeDelete = vi.fn(() => ({ allowed: true as const }));

		await expect(
			guardDelete({
				session: { user: { id: "user-1", role: "CUSTOMER" } },
				key: KEY,
				authorizeDelete,
			}),
		).resolves.toEqual({ ok: false, code: "FORBIDDEN" });
		expect(authorizeDelete).not.toHaveBeenCalled();
	});

	it("fails closed for an authenticated admin with no authorizer", async () => {
		await expect(guardDelete({ session: adminSession, key: KEY })).resolves.toEqual({
			ok: false,
			code: "FORBIDDEN",
			details: { cause: "authorizeDelete is not configured" },
		});
	});

	it("lets an authorized admin through and returns the actor", async () => {
		await expect(
			guardDelete({
				session: adminSession,
				key: KEY,
				authorizeDelete: () => ({ allowed: true }),
			}),
		).resolves.toEqual({ ok: true, actor: { id: "admin-1", role: "ADMIN" } });
	});
});
