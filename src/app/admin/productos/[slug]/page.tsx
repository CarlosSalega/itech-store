import { findAdminProduct } from "@/features/admin/server/product-repository";
import { ProductDetailScreen } from "@/features/admin/ui/product-detail-screen";

export const instant = false;

export default async function AdminProductoPage({
	params,
}: PageProps<"/admin/productos/[slug]">) {
	const { slug } = await params;
	const product = await findAdminProduct(slug);

	return <ProductDetailScreen initialProduct={product} slug={slug} />;
}
