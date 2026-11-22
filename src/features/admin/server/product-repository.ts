import type { AdminProduct } from "../domain/product";
import { ADMIN_PRODUCTS } from "../fixtures/products";

export async function listAdminProducts(): Promise<readonly AdminProduct[]> {
	return ADMIN_PRODUCTS;
}

export async function findAdminProduct(slug: string): Promise<AdminProduct | null> {
	return ADMIN_PRODUCTS.find((product) => product.slug === slug) ?? null;
}
