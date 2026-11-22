export type AdminDestinationId = "panel" | "productos" | "pedidos" | "ajustes";

export type AdminDestination = {
	id: AdminDestinationId;
	href: string;
	label: string;
};

export const ADMIN_DESTINATIONS = [
	{ id: "panel", href: "/admin", label: "Panel" },
	{ id: "productos", href: "/admin/productos", label: "Productos" },
	{ id: "pedidos", href: "/admin/pedidos", label: "Pedidos" },
	{ id: "ajustes", href: "/admin/ajustes", label: "Ajustes" },
] as const satisfies readonly AdminDestination[];

export const ADMIN_PRODUCT_LINKS = [
	{ href: "/admin/productos", label: "Todos" },
	{ href: "/admin/productos/nuevo", label: "Nuevo producto" },
] as const;

function withoutTrailingSlash(pathname: string): string {
	const trimmed = pathname.trim();

	return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}

export function activeDestination(pathname: string): AdminDestinationId | null {
	const path = withoutTrailingSlash(pathname);

	const exact = ADMIN_DESTINATIONS.find((destination) => destination.href === path);

	if (exact !== undefined) {
		return exact.id;
	}

	const nested = [...ADMIN_DESTINATIONS]
		.sort((left, right) => right.href.length - left.href.length)
		.find((destination) => path.startsWith(`${destination.href}/`));

	return nested?.id ?? null;
}
