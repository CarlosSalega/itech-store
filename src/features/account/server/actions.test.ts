import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	listMyOrders,
	requestMagicLink,
	type MagicLinkState,
} from "./actions";

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
	signInMagicLink: vi.fn(),
	findMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
	getAuth: () => ({ api: { getSession: mocks.getSession, signInMagicLink: mocks.signInMagicLink } }),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

vi.mock("@/lib/prisma", () => ({
	prisma: { order: { findMany: mocks.findMany } },
}));

const EMPTY: MagicLinkState = { error: null, message: null, fieldError: null };

function form(fields: Record<string, string>): FormData {
	const data = new FormData();

	for (const [name, value] of Object.entries(fields)) data.set(name, value);

	return data;
}

beforeEach(() => {
	mocks.getSession.mockReset();
	mocks.signInMagicLink.mockReset();
	mocks.findMany.mockReset();
});

describe("requestMagicLink", () => {
	it("refuses an invalid email before touching the provider", async () => {
		const state = await requestMagicLink(EMPTY, form({ email: "nope" }));

		expect(state.fieldError).not.toBeNull();
		expect(mocks.signInMagicLink).not.toHaveBeenCalled();
	});

	it("answers the sent copy after asking the provider for a link", async () => {
		mocks.signInMagicLink.mockResolvedValueOnce({});

		const state = await requestMagicLink(
			EMPTY,
			form({ email: "sofia@example.com" }),
		);

		expect(state.message).not.toBeNull();
		expect(state.error).toBeNull();
		expect(mocks.signInMagicLink).toHaveBeenCalledWith(
			expect.objectContaining({
				body: { email: "sofia@example.com", callbackURL: "/mis-pedidos" },
			}),
		);
	});

	it("answers the failure copy when the provider cannot send", async () => {
		mocks.signInMagicLink.mockRejectedValueOnce(new Error("EMAIL_NOT_SENT"));

		const state = await requestMagicLink(
			EMPTY,
			form({ email: "sofia@example.com" }),
		);

		expect(state.error).not.toBeNull();
		expect(state.message).toBeNull();
	});
});

describe("listMyOrders", () => {
	it("answers ok false without a session", async () => {
		mocks.getSession.mockResolvedValueOnce(null);

		expect(await listMyOrders()).toEqual({ ok: false });
		expect(mocks.findMany).not.toHaveBeenCalled();
	});

	it("reads the orders of the session's user id or buyer email", async () => {
		mocks.getSession.mockResolvedValueOnce({
			user: { id: "u-1", email: "sofia@example.com" },
		});
		mocks.findMany.mockResolvedValueOnce([
			{
				id: "o-1",
				number: "IT-2026-1",
				status: "nuevo",
				payment: "transfer",
				buyerName: "Sofía Ramos",
				buyerEmail: "sofia@example.com",
				buyerPhone: "11 5555 0100",
				buyerAddress: "Av. Córdoba 1875",
				buyerCity: "CABA",
				buyerPostalCode: "1120",
				createdAt: new Date("2026-11-28T10:00:00.000Z"),
				lines: [
					{
						productName: "Apple iPad 11",
						productSlug: "apple-ipad-11",
						familyLabel: "iPad",
						variantSku: "IPAD-A16-256",
						variantLabel: "Capacidad 256 GB",
						quantity: 2,
						unitPriceCents: 103_500_000,
						imageUrl: null,
						imageAlt: "iPad",
					},
				],
			},
		]);

		const result = await listMyOrders();

		expect(mocks.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					OR: [{ userId: "u-1" }, { buyerEmail: "sofia@example.com" }],
				},
			}),
		);
		expect(result.ok).toBe(true);

		if (result.ok) {
			expect(result.orders[0]?.number).toBe("IT-2026-1");
		}
	});

	it("answers ok false when the database fails", async () => {
		mocks.getSession.mockResolvedValueOnce({
			user: { id: "u-1", email: "sofia@example.com" },
		});
		mocks.findMany.mockRejectedValueOnce(new Error("down"));

		expect(await listMyOrders()).toEqual({ ok: false });
	});
});
