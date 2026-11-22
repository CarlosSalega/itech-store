import type { Metadata } from "next";

import { AdminPlaceholder } from "@/features/admin/ui/placeholder";

export const metadata: Metadata = {
	title: "Pedidos — iTech Store",
	description: "Los pedidos de la demo de iTech Store, con su comprador, su total y su estado.",
	robots: { index: false, follow: false },
};

export default function AdminPedidosPage() {
	return (
		<AdminPlaceholder
			deck="Los pedidos de la demo, con su comprador, su total y su estado."
			next="Esta pantalla es la próxima entrega del panel: por ahora los pedidos se ven en el tablero."
			title="Pedidos"
		/>
	);
}
