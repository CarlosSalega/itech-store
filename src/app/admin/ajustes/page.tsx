import { listAdminProducts } from "@/features/admin/server/product-repository";
import { SettingsScreen } from "@/features/admin/ui/settings-screen";

export const instant = false;

export default async function AdminAjustesPage() {
	const products = await listAdminProducts();

	return <SettingsScreen products={products} />;
}
