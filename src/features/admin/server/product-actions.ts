import type { Category } from "@/generated/prisma/enums";

import {
	createProduct,
	updateProduct,
	type AdminProduct,
	type AdminProductImage,
	type AdminProductPatch,
	type AdminVariant,
	type AdminVariantInput,
} from "../domain/product";
import { adminAccess, type SessionUser } from "../domain/session";
import {
	reconcileProductGallery,
	type ProductImageDelegate,
} from "./product-gallery";
import {
	ADMIN_PRODUCT_SELECT,
	toAdminProduct,
	type AdminProductRow,
} from "./product-repository";
import { reconcileProductVariants, type VariantDelegate } from "./product-variants";

export const ADMIN_ACTION_PATH = "/admin";

export type AdminProductInput = {
	name: string;
	description: string | null;
	category: Category;
	gallery: readonly AdminProductImage[];
	published: boolean;
	destacado: boolean;
	variants: readonly AdminVariantInput[];
};

export type AdminActionRefusal =
	| "SESION_REQUERIDA"
	| "PERMISO_DENEGADO"
	| "PRODUCTO_INEXISTENTE"
	| "DATOS_INVALIDOS";

export type AdminActionResult =
	| { ok: true; slug: string }
	| { ok: false; code: AdminActionRefusal; message: string };

export const ADMIN_ACTION_MESSAGES: Record<AdminActionRefusal, string> = {
	SESION_REQUERIDA: "Iniciá sesión para administrar el catálogo.",
	PERMISO_DENEGADO: "Tu cuenta no tiene permiso para administrar el catálogo.",
	PRODUCTO_INEXISTENTE: "Ese producto ya no está en el catálogo.",
	DATOS_INVALIDOS: "Revisá los datos del producto.",
};

export const ADMIN_WRITE_SELECT = { id: true, ...ADMIN_PRODUCT_SELECT } as const;

export type AdminWriteRow = AdminProductRow & { id: string };

type AdminProductFields = {
	name: string;
	description: string;
	category: Category;
	published: boolean;
	featured: boolean;
};

type AdminProductCreateData = AdminProductFields & { slug: string };

export type AdminProductWriteDelegate = {
	findUnique(args: {
		where: { slug: string };
		select: typeof ADMIN_WRITE_SELECT;
	}): Promise<AdminWriteRow | null>;
	create(args: {
		data: AdminProductCreateData;
		select: { id: true };
	}): Promise<{ id: string }>;
	update(args: {
		where: { slug: string };
		data: Partial<AdminProductFields>;
		select: { id: true };
	}): Promise<{ id: string }>;
	delete(args: { where: { slug: string } }): Promise<unknown>;
};

export type AdminWriteClient = {
	product: AdminProductWriteDelegate;
	productImage: ProductImageDelegate;
	variant: VariantDelegate;
};

export type AdminProductActionsDeps = {
	readSession: () => Promise<SessionUser>;
	client: AdminWriteClient;
	revalidate: (paths: readonly string[]) => void;
};

export type AdminProductActions = {
	create: (input: AdminProductInput) => Promise<AdminActionResult>;
	update: (slug: string, patch: AdminProductPatch) => Promise<AdminActionResult>;
	publish: (slug: string) => Promise<AdminActionResult>;
	unpublish: (slug: string) => Promise<AdminActionResult>;
	remove: (slug: string) => Promise<AdminActionResult>;
};

function refused(code: AdminActionRefusal, message?: string): AdminActionResult {
	return { ok: false, code, message: message ?? ADMIN_ACTION_MESSAGES[code] };
}

function saved(slug: string): AdminActionResult {
	return { ok: true, slug };
}

function fieldsOf(product: AdminProduct): AdminProductFields {
	return {
		name: product.name,
		description: product.description ?? "",
		category: product.category,
		published: product.published,
		featured: product.destacado,
	};
}

function variantRows(variants: readonly AdminVariant[]) {
	return variants.map((variant) => ({
		sku: variant.sku,
		storage: variant.label,
		price: variant.priceCents,
		stock: variant.stock,
	}));
}

function actionPaths(slug: string): readonly string[] {
	return [
		"/admin",
		"/admin/productos",
		`/admin/productos/${slug}`,
		"/",
		"/catalogo",
		`/catalogo/${slug}`,
	];
}

export function createAdminProductActions({
	readSession,
	client,
	revalidate,
}: AdminProductActionsDeps): AdminProductActions {
	async function refuse(): Promise<AdminActionResult | null> {
		const user = await readSession();

		if (user === null) {
			return refused("SESION_REQUERIDA");
		}

		if (adminAccess(user, ADMIN_ACTION_PATH).allowed) {
			return null;
		}

		return refused("PERMISO_DENEGADO");
	}

	async function current(slug: string): Promise<AdminWriteRow | null> {
		return client.product.findUnique({ where: { slug }, select: ADMIN_WRITE_SELECT });
	}

	async function saveGallery(productId: string, gallery: readonly AdminProductImage[]) {
		await reconcileProductGallery(client.productImage, productId, gallery);
	}

	async function saveVariants(productId: string, variants: readonly AdminVariant[]) {
		await reconcileProductVariants(client.variant, productId, variantRows(variants));
	}

	async function create(input: AdminProductInput): Promise<AdminActionResult> {
		const blocked = await refuse();

		if (blocked !== null) {
			return blocked;
		}

		let product: AdminProduct;

		try {
			product = createProduct({ ...input, createdAt: new Date().toISOString() });
		} catch (error) {
			const message = error instanceof Error ? error.message : undefined;

			return refused("DATOS_INVALIDOS", message);
		}

		const row = await client.product.create({
			data: { slug: product.slug, ...fieldsOf(product) },
			select: { id: true },
		});

		await saveGallery(row.id, product.gallery);
		await saveVariants(row.id, product.variants);
		revalidate(actionPaths(product.slug));

		return saved(product.slug);
	}

	async function update(slug: string, patch: AdminProductPatch): Promise<AdminActionResult> {
		const blocked = await refuse();

		if (blocked !== null) {
			return blocked;
		}

		const row = await current(slug);

		if (row === null) {
			return refused("PRODUCTO_INEXISTENTE");
		}

		const [product] = updateProduct([toAdminProduct(row)], slug, patch);

		await client.product.update({
			where: { slug },
			data: fieldsOf(product),
			select: { id: true },
		});
		await saveGallery(row.id, product.gallery);
		await saveVariants(row.id, product.variants);
		revalidate(actionPaths(slug));

		return saved(slug);
	}

	async function setPublished(slug: string, published: boolean): Promise<AdminActionResult> {
		const blocked = await refuse();

		if (blocked !== null) {
			return blocked;
		}

		if ((await current(slug)) === null) {
			return refused("PRODUCTO_INEXISTENTE");
		}

		await client.product.update({
			where: { slug },
			data: { published },
			select: { id: true },
		});
		revalidate(actionPaths(slug));

		return saved(slug);
	}

	async function remove(slug: string): Promise<AdminActionResult> {
		const blocked = await refuse();

		if (blocked !== null) {
			return blocked;
		}

		if ((await current(slug)) === null) {
			return refused("PRODUCTO_INEXISTENTE");
		}

		await client.product.delete({ where: { slug } });
		revalidate(actionPaths(slug));

		return saved(slug);
	}

	return {
		create,
		update,
		publish: (slug) => setPublished(slug, true),
		unpublish: (slug) => setPublished(slug, false),
		remove,
	};
}
