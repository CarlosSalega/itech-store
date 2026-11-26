import { describe, expect, it } from "vitest";

import type { OrderStatus as OrderStatusRow } from "@/generated/prisma/enums";

import type { SessionUser } from "../domain/session";
import {
	ORDER_ACTION_MESSAGES,
	ORDER_ACTION_PATHS,
	createAdminOrderActions,
	type AdminOrderActionResult,
	type AdminOrderWriteClient,
} from "./order-actions";

const ADMIN: SessionUser = {
	role: "ADMIN",
	name: "Info",
	email: "info@itechstore.com",
};

const CUSTOMER: SessionUser = {
	role: "CUSTOMER",
	name: "Ana",
	email: "ana@correo.com",
};

const NUMBER = "IT-2026-0002";

function fakeClient(numbers: readonly string[] = [NUMBER]) {
	const statuses = new Map<string, OrderStatusRow>(
		numbers.map((number) => [number, "nuevo"]),
	);
	const calls: string[] = [];

	const client: AdminOrderWriteClient = {
		order: {
			findUnique: async (args) => {
				calls.push(`order.findUnique:${args.where.number}`);

				return statuses.has(args.where.number)
					? { id: `id_${args.where.number}` }
					: null;
			},
			update: async (args) => {
				calls.push(`order.update:${args.where.number}:${args.data.status}`);
				statuses.set(args.where.number, args.data.status);

				return { id: `id_${args.where.number}` };
			},
		},
	};

	return {
		client,
		calls,
		statusOf: (number: string) => statuses.get(number),
	};
}

function actionsFor(
	user: SessionUser,
	numbers?: readonly string[],
) {
	const { client, calls, statusOf } = fakeClient(numbers);
	const revalidated: string[][] = [];
	const sessions = { reads: 0 };

	const actions = createAdminOrderActions({
		readSession: async () => {
			sessions.reads += 1;

			return user;
		},
		client,
		revalidate: (paths) => {
			revalidated.push([...paths]);
		},
	});

	return { actions, calls, statusOf, revalidated, sessions };
}

describe("a status change the panel refuses", () => {
	it("refuses an anonymous request without touching an order", async () => {
		const { actions, calls, revalidated } = actionsFor(null);

		const result = await actions.changeStatus(NUMBER, "enviado");

		expect(result).toEqual({
			ok: false,
			code: "SESION_REQUERIDA",
			message: ORDER_ACTION_MESSAGES.SESION_REQUERIDA,
		});
		expect(calls).toEqual([]);
		expect(revalidated).toEqual([]);
	});

	it("refuses a customer before reading or writing the order", async () => {
		const { actions, calls, revalidated, statusOf, sessions } = actionsFor(CUSTOMER);

		const result = await actions.changeStatus(NUMBER, "enviado");

		expect(result).toEqual({
			ok: false,
			code: "PERMISO_DENEGADO",
			message: ORDER_ACTION_MESSAGES.PERMISO_DENEGADO,
		});
		expect(sessions.reads).toBe(1);
		expect(calls).toEqual([]);
		expect(revalidated).toEqual([]);
		expect(statusOf(NUMBER)).toBe("nuevo");
	});

	it("refuses an order the database does not have, and writes nothing", async () => {
		const { actions, calls, revalidated } = actionsFor(ADMIN);

		const result = await actions.changeStatus("IT-2026-9999", "enviado");

		expect(result).toEqual({
			ok: false,
			code: "PEDIDO_INEXISTENTE",
			message: ORDER_ACTION_MESSAGES.PEDIDO_INEXISTENTE,
		});
		expect(calls).toEqual(["order.findUnique:IT-2026-9999"]);
		expect(revalidated).toEqual([]);
	});

	it.each(["perdido", "ENVIADO", "en preparacion", "", "  "])(
		"refuses %j as a status the domain does not allow",
		async (status) => {
			const { actions, calls, revalidated, statusOf } = actionsFor(ADMIN);

			const result = await actions.changeStatus(NUMBER, status);

			expect(result).toEqual({
				ok: false,
				code: "ESTADO_INVALIDO",
				message: ORDER_ACTION_MESSAGES.ESTADO_INVALIDO,
			});
			expect(calls).toEqual([]);
			expect(revalidated).toEqual([]);
			expect(statusOf(NUMBER)).toBe("nuevo");
		},
	);
});

describe("a status change the panel accepts", () => {
	it.each([
		["nuevo", "nuevo"],
		["en preparación", "en_preparacion"],
		["enviado", "enviado"],
		["entregado", "entregado"],
		["cancelado", "cancelado"],
	] as const)("writes %s as %s on the order it names", async (status, stored) => {
		const { actions, calls, statusOf } = actionsFor(ADMIN);

		const result = await actions.changeStatus(NUMBER, status);

		expect(result).toEqual({ ok: true, number: NUMBER, status });
		expect(calls).toEqual([
			`order.findUnique:${NUMBER}`,
			`order.update:${NUMBER}:${stored}`,
		]);
		expect(statusOf(NUMBER)).toBe(stored);
	});

	it("changes that order only and revalidates the panel", async () => {
		const other = "IT-2026-0001";
		const { actions, statusOf, revalidated, sessions } = actionsFor(ADMIN, [
			NUMBER,
			other,
		]);

		const result = await actions.changeStatus(NUMBER, "entregado");

		expect(result.ok).toBe(true);
		expect(sessions.reads).toBe(1);
		expect(statusOf(NUMBER)).toBe("entregado");
		expect(statusOf(other)).toBe("nuevo");
		expect(revalidated).toEqual([[...ORDER_ACTION_PATHS]]);
		expect(ORDER_ACTION_PATHS).toEqual(["/admin", "/admin/pedidos"]);
	});

	it("answers a refusal with its code and its message, never with a sentence alone", async () => {
		const { actions } = actionsFor(null);

		const result: AdminOrderActionResult = await actions.changeStatus(
			NUMBER,
			"enviado",
		);

		expect(result.ok).toBe(false);
		expect(result.ok ? "" : result.code).toBe("SESION_REQUERIDA");
		expect(Object.keys(ORDER_ACTION_MESSAGES).sort()).toEqual([
			"ESTADO_INVALIDO",
			"PEDIDO_INEXISTENTE",
			"PERMISO_DENEGADO",
			"SESION_REQUERIDA",
		]);
	});
});
