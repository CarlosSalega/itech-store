import {
	deleteProductAction,
	publishProductAction,
	unpublishProductAction,
	updateProductAction,
} from "@/features/admin/server/actions";
import {
	findAdminProduct,
	findAdminProductId,
} from "@/features/admin/server/product-repository";
import { ProductDetailScreen } from "@/features/admin/ui/product-detail-screen";
export const instant = false;

export default async function AdminProductoPage({
	params,
}: PageProps<"/admin/productos/[slug]">) {
	const { slug } = await params;
	const [product, productId] = await Promise.all([
		findAdminProduct(slug),
		findAdminProductId(slug),
	]);

	return (
		<ProductDetailScreen
			actions={{
				update: updateProductAction,
				publish: publishProductAction,
				unpublish: unpublishProductAction,
				remove: deleteProductAction,
			}}
			initialProduct={product}
			productId={productId}
		/>
	);
}
