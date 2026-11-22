import type { Metadata } from "next";

import { AdminPlaceholder } from "@/features/admin/ui/placeholder";

export const metadata: Metadata = {
	title: "Productos — iTech Store",
	description: "El catálogo del panel de iTech Store, con sus variantes, precios y stock.",
	robots: { index: false, follow: false },
};

export default function AdminProductosPage() {
	return (
		<AdminPlaceholder
			deck="El catálogo completo, con las variantes, los precios y el stock de cada producto."
			next="Esta pantalla es la próxima entrega del panel: la cáscara ya está y los datos siguen siendo de ejemplo."
			title="Productos"
		/>
	);
}
