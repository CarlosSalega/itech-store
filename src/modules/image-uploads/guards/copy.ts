import type { ForbiddenReason, ProductRef } from "./types";

export const FORBIDDEN_MESSAGES: Record<ForbiddenReason, (product: ProductRef) => string> = {
	OTHER_PRODUCT: (product) =>
		`No tienes permiso para eliminar esta imagen: pertenece al producto «${product.name}».`,
};

export function forbiddenMessage(reason: ForbiddenReason, product: ProductRef): string {
	return FORBIDDEN_MESSAGES[reason](product);
}
