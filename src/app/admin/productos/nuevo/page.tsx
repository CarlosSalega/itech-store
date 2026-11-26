import { createProductAction } from "@/features/admin/server/actions";
import { listAdminProducts } from "@/features/admin/server/product-repository";
import { NewProductScreen } from "@/features/admin/ui/new-product-screen";

export default async function AdminNuevoProductoPage() {
	const products = await listAdminProducts();

	return <NewProductScreen create={createProductAction} products={products} />;
}
