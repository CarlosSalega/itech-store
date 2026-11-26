import type { AdminProductPatch } from "../domain/product";
import type { AdminActionResult, AdminProductInput } from "../server/product-actions";

export type ProductCreateAction = (input: AdminProductInput) => Promise<AdminActionResult>;

export type ProductUpdateAction = (
	slug: string,
	patch: AdminProductPatch,
) => Promise<AdminActionResult>;

export type ProductSlugAction = (slug: string) => Promise<AdminActionResult>;

export type ProductDetailActions = {
	readonly update: ProductUpdateAction;
	readonly publish: ProductSlugAction;
	readonly unpublish: ProductSlugAction;
	readonly remove: ProductSlugAction;
};

export type ActionFeedback = {
	readonly pending: boolean;
	readonly message: string | null;
};

export const IDLE_FEEDBACK: ActionFeedback = { pending: false, message: null };
export const PENDING_FEEDBACK: ActionFeedback = { pending: true, message: null };

export const UNREACHABLE_MESSAGE =
	"No pudimos comunicarnos con el servidor. Probá de nuevo.";

export async function runAction(
	run: () => Promise<AdminActionResult>,
): Promise<AdminActionResult> {
	try {
		return await run();
	} catch {
		return { ok: false, code: "DATOS_INVALIDOS", message: UNREACHABLE_MESSAGE };
	}
}

export function feedbackOf(result: AdminActionResult): ActionFeedback {
	return result.ok ? IDLE_FEEDBACK : { pending: false, message: result.message };
}
