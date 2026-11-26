import { listAdminProducts } from "@/features/admin/server/product-repository";
import { SettingsScreen } from "@/features/admin/ui/settings-screen";

export default async function AdminAjustesPage() {
	const products = await listAdminProducts();

	return <SettingsScreen products={products} />;
}
