import { findAdminProduct } from "@/features/admin/server/product-repository";
import { AdminPlaceholder } from "@/features/admin/ui/placeholder";

export const instant = false;

export default async function AdminProductoPage({
	params,
}: PageProps<"/admin/productos/[slug]">) {
	const { slug } = await params;
	const product = await findAdminProduct(slug);

	return (
		<AdminPlaceholder
			deck="La ficha del producto, con sus variantes, su precio y su stock."
			next={
				product === null
					? "Ese producto no está en el catálogo de la demo."
					: "Esta pantalla es la próxima entrega del panel: por ahora ves el nombre y la cáscara."
			}
			title={product?.name ?? "Producto"}
		/>
	);
}
