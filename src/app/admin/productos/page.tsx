import { Suspense } from "react";

import { listAdminProducts } from "@/features/admin/server/product-repository";
import { ProductsList } from "@/features/admin/ui/products-list";
import { ScreenPending } from "@/features/admin/ui/screen";

export default async function AdminProductosPage() {
	const products = await listAdminProducts();

	return (
		<Suspense fallback={<ScreenPending label="Cargando los productos…" />}>
			<ProductsList products={products} />
		</Suspense>
	);
}
