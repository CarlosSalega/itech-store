import type { OrderStatus as OrderStatusRow } from "@/generated/prisma/enums";

import type { OrderStatus } from "@/features/checkout/domain/order";

import { isOrderStatus } from "../domain/order-inbox";
import { adminAccess, type SessionUser } from "../domain/session";

export const ORDER_ACTION_PATH = "/admin/pedidos";

export const ORDER_ACTION_PATHS: readonly string[] = ["/admin", "/admin/pedidos"];

export type AdminOrderActionRefusal =
	| "SESION_REQUERIDA"
	| "PERMISO_DENEGADO"
	| "PEDIDO_INEXISTENTE"
	| "ESTADO_INVALIDO";

export type AdminOrderActionResult =
	| { ok: true; number: string; status: OrderStatus }
	| { ok: false; code: AdminOrderActionRefusal; message: string };

export const ORDER_ACTION_MESSAGES: Record<AdminOrderActionRefusal, string> = {
	SESION_REQUERIDA: "Iniciá sesión para administrar los pedidos.",
	PERMISO_DENEGADO: "Tu cuenta no tiene permiso para administrar los pedidos.",
	PEDIDO_INEXISTENTE: "Ese pedido ya no está en la lista.",
	ESTADO_INVALIDO: "Ese estado no es uno de los que el pedido admite.",
};

const STATUS_ROW: Record<OrderStatus, OrderStatusRow> = {
	nuevo: "nuevo",
	"en preparación": "en_preparacion",
	enviado: "enviado",
	entregado: "entregado",
	cancelado: "cancelado",
};

export type AdminOrderWriteClient = {
	order: {
		findUnique(args: {
			where: { number: string };
			select: { id: true };
		}): Promise<{ id: string } | null>;
		update(args: {
			where: { number: string };
			data: { status: OrderStatusRow };
			select: { id: true };
		}): Promise<{ id: string }>;
	};
};

export type AdminOrderActionsDeps = {
	readSession: () => Promise<SessionUser>;
	client: AdminOrderWriteClient;
	revalidate: (paths: readonly string[]) => void;
};

export type AdminOrderActions = {
	changeStatus: (number: string, status: string) => Promise<AdminOrderActionResult>;
};

function refused(code: AdminOrderActionRefusal): AdminOrderActionResult {
	return { ok: false, code, message: ORDER_ACTION_MESSAGES[code] };
}

export function createAdminOrderActions({
	readSession,
	client,
	revalidate,
}: AdminOrderActionsDeps): AdminOrderActions {
	async function refuse(): Promise<AdminOrderActionResult | null> {
		const user = await readSession();

		if (user === null) {
			return refused("SESION_REQUERIDA");
		}

		if (adminAccess(user, ORDER_ACTION_PATH).allowed) {
			return null;
		}

		return refused("PERMISO_DENEGADO");
	}

	async function changeStatus(
		number: string,
		status: string,
	): Promise<AdminOrderActionResult> {
		const blocked = await refuse();

		if (blocked !== null) {
			return blocked;
		}

		if (!isOrderStatus(status)) {
			return refused("ESTADO_INVALIDO");
		}

		const row = await client.order.findUnique({
			where: { number },
			select: { id: true },
		});

		if (row === null) {
			return refused("PEDIDO_INEXISTENTE");
		}

		await client.order.update({
			where: { number },
			data: { status: STATUS_ROW[status] },
			select: { id: true },
		});
		revalidate(ORDER_ACTION_PATHS);

		return { ok: true, number, status };
	}

	return { changeStatus };
}
