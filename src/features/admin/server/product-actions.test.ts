import { describe, expect, it } from "vitest";

import type { Category } from "@/generated/prisma/enums";

import type { AdminProductPatch } from "../domain/product";
import type { SessionUser } from "../domain/session";
import {
	createAdminProductActions,
	type AdminActionResult,
	type AdminProductInput,
	type AdminWriteClient,
} from "./product-actions";

const ADMIN: SessionUser = {
	role: "ADMIN",
	name: "Info",
	email: "info@itechstore.com",
};

const CUSTOMER: SessionUser = {
	role: "CUSTOMER",
	name: "Ana",
	email: "ana@correo.com",
};

const SLUG = "apple-iphone-17-pro";

const INPUT: AdminProductInput = {
	name: "Apple iPhone 17 Pro",
	description: null,
	category: "IPHONE",
	published: true,
	destacado: false,
	gallery: [
		{ position: 1, alt: "Apple iPhone 17 Pro — foto 2", url: "/products/iphone/2.webp" },
		{
			position: 0,
			alt: "Apple iPhone 17 Pro — foto principal",
			url: "/products/iphone/1.webp",
		},
	],
	variants: [{ label: "256 GB", priceCents: 1_500_000, stock: 3 }],
};

type StoredProduct = {
	id: string;
	slug: string;
	name: string;
	description: string;
	category: Category;
	published: boolean;
	featured: boolean;
	createdAt: Date;
};

type StoredImage = { position: number; alt: string; url: string };

type StoredVariant = {
	sku: string;
	storage: string | null;
	price: number;
	stock: number;
};

function fakeClient() {
	const products = new Map<string, StoredProduct>();
	const images = new Map<string, StoredImage[]>();
	const variants = new Map<string, StoredVariant[]>();
	const calls: string[] = [];
	let nextId = 1;

	const galleryOf = (productId: string) =>
		[...(images.get(productId) ?? [])].sort(
			(first, second) => first.position - second.position,
		);

	const variantsOf = (productId: string) => [...(variants.get(productId) ?? [])];

	const client: AdminWriteClient = {
		product: {
			findUnique: async (args) => {
				calls.push(`product.findUnique:${args.where.slug}`);

				const product = products.get(args.where.slug);

				if (product === undefined) {
					return null;
				}

				return {
					...product,
					gallery: galleryOf(product.id),
					variants: variantsOf(product.id).map((variant) => ({
						...variant,
						color: null,
					})),
				};
			},
			create: async (args) => {
				calls.push(`product.create:${args.data.slug}`);

				const product: StoredProduct = {
					id: `product_${nextId++}`,
					createdAt: new Date("2026-11-27T12:00:00.000Z"),
					...args.data,
				};

				products.set(product.slug, product);

				return { id: product.id };
			},
			update: async (args) => {
				calls.push(`product.update:${args.where.slug}`);

				const product = products.get(args.where.slug);

				if (product === undefined) {
					throw new Error(`no product ${args.where.slug}`);
				}

				Object.assign(product, args.data);

				return { id: product.id };
			},
			delete: async (args) => {
				calls.push(`product.delete:${args.where.slug}`);

				const product = products.get(args.where.slug);

				if (product !== undefined) {
					images.delete(product.id);
					variants.delete(product.id);
					products.delete(args.where.slug);
				}
			},
		},
		productImage: {
			findMany: async (args) => galleryOf(args.where.productId),
			create: async (args) => {
				calls.push(`productImage.create:${args.data.position}`);

				const rows = images.get(args.data.productId) ?? [];

				rows.push({
					position: args.data.position,
					alt: args.data.alt,
					url: args.data.url,
				});
				images.set(args.data.productId, rows);
			},
			update: async (args) => {
				calls.push(`productImage.update:${args.where.productId_position.position}`);

				const rows = images.get(args.where.productId_position.productId) ?? [];
				const hit = rows.find(
					(row) => row.position === args.where.productId_position.position,
				);

				if (hit !== undefined) {
					hit.alt = args.data.alt;
					hit.url = args.data.url;
				}
			},
			deleteMany: async (args) => {
				calls.push(`productImage.deleteMany:${[...args.where.position.in].join(",")}`);

				const rows = images.get(args.where.productId) ?? [];
				const dropped = new Set(args.where.position.in);

				images.set(
					args.where.productId,
					rows.filter((row) => !dropped.has(row.position)),
				);
			},
		},
		variant: {
			findMany: async (args) => variantsOf(args.where.productId),
			create: async (args) => {
				calls.push(`variant.create:${args.data.sku}`);

				const rows = variants.get(args.data.productId) ?? [];

				rows.push({
					sku: args.data.sku,
					storage: args.data.storage,
					price: args.data.price,
					stock: args.data.stock,
				});
				variants.set(args.data.productId, rows);
			},
			update: async (args) => {
				calls.push(`variant.update:${args.where.sku}`);

				for (const rows of variants.values()) {
					const hit = rows.find((row) => row.sku === args.where.sku);

					if (hit !== undefined) {
						hit.storage = args.data.storage;
						hit.price = args.data.price;
						hit.stock = args.data.stock;
					}
				}
			},
			deleteMany: async (args) => {
				const dropped = new Set(args.where.sku.in);

				calls.push(`variant.deleteMany:${[...dropped].join(",")}`);

				const rows = variants.get(args.where.productId) ?? [];

				variants.set(
					args.where.productId,
					rows.filter((row) => !dropped.has(row.sku)),
				);
			},
		},
	};

	return { client, products, images, variants, calls };
}

function actionsFor(session: SessionUser) {
	const fake = fakeClient();
	const revalidated: string[] = [];
	const actions = createAdminProductActions({
		readSession: async () => session,
		client: fake.client,
		revalidate: (paths) => revalidated.push(...paths),
	});

	return { ...fake, revalidated, actions };
}

const CALLS: readonly [string, (actions: ReturnType<typeof actionsFor>["actions"]) => Promise<AdminActionResult>][] = [
	["create", (actions) => actions.create(INPUT)],
	["update", (actions) => actions.update(SLUG, { name: "Apple iPhone 17 Pro" })],
	["publish", (actions) => actions.publish(SLUG)],
	["unpublish", (actions) => actions.unpublish(SLUG)],
	["delete", (actions) => actions.remove(SLUG)],
];

function storedProduct(
	products: Map<string, StoredProduct>,
	slug: string,
): StoredProduct {
	const product = products.get(slug);

	if (product === undefined) {
		throw new Error(`el catálogo no tiene ${slug}`);
	}

	return product;
}

describe("an anonymous caller", () => {
	for (const [name, run] of CALLS) {
		it(`cannot ${name} a product`, async () => {
			const state = actionsFor(null);

			expect(await run(state.actions)).toEqual({
				ok: false,
				code: "SESION_REQUERIDA",
				message: "Iniciá sesión para administrar el catálogo.",
			});
			expect(state.calls).toEqual([]);
			expect(state.revalidated).toEqual([]);
		});
	}
});

describe("a signed-in customer", () => {
	for (const [name, run] of CALLS) {
		it(`cannot ${name} a product`, async () => {
			const state = actionsFor(CUSTOMER);

			expect(await run(state.actions)).toEqual({
				ok: false,
				code: "PERMISO_DENEGADO",
				message: "Tu cuenta no tiene permiso para administrar el catálogo.",
			});
			expect(state.calls).toEqual([]);
			expect(state.revalidated).toEqual([]);
		});
	}
});

describe("an admin saving a new product", () => {
	it("writes the product, its gallery in position order and its variants", async () => {
		const state = actionsFor(ADMIN);

		expect(await state.actions.create(INPUT)).toEqual({ ok: true, slug: SLUG });

		const product = storedProduct(state.products, SLUG);

		expect(product).toMatchObject({
			name: "Apple iPhone 17 Pro",
			description: "",
			category: "IPHONE",
			published: true,
			featured: false,
		});
		expect(state.images.get(product.id)).toEqual([
			{
				position: 0,
				alt: "Apple iPhone 17 Pro — foto principal",
				url: "/products/iphone/1.webp",
			},
			{ position: 1, alt: "Apple iPhone 17 Pro — foto 2", url: "/products/iphone/2.webp" },
		]);
		expect(state.variants.get(product.id)).toEqual([
			{
				sku: "apple-iphone-17-pro-256gb",
				storage: "256 GB",
				price: 1_500_000,
				stock: 3,
			},
		]);
		expect(state.revalidated).toEqual([
			"/admin",
			"/admin/productos",
			`/admin/productos/${SLUG}`,
			"/",
			"/catalogo",
			`/catalogo/${SLUG}`,
		]);
	});

	it("refuses a product the domain rejects, without touching data", async () => {
		const state = actionsFor(ADMIN);

		expect(await state.actions.create({ ...INPUT, name: "   " })).toEqual({
			ok: false,
			code: "DATOS_INVALIDOS",
			message: "El producto necesita un nombre.",
		});
		expect(state.calls).toEqual([]);
		expect(state.revalidated).toEqual([]);
	});

	it("answers a product that is not there", async () => {
		const state = actionsFor(ADMIN);

		expect(await state.actions.update(SLUG, { name: "Otro" })).toEqual({
			ok: false,
			code: "PRODUCTO_INEXISTENTE",
			message: "Ese producto ya no está en el catálogo.",
		});
		expect(state.calls).toEqual([`product.findUnique:${SLUG}`]);
		expect(state.revalidated).toEqual([]);
	});
});

describe("an admin editing a product", () => {
	it("saves the change and leaves the gallery alone when the form carries none", async () => {
		const state = actionsFor(ADMIN);

		await state.actions.create(INPUT);

		const product = storedProduct(state.products, SLUG);
		const gallery = [...(state.images.get(product.id) ?? [])];

		state.calls.length = 0;

		const patch: AdminProductPatch = { variants: [
			{ sku: "apple-iphone-17-pro-256gb", label: "256 GB", priceCents: 1_400_000, stock: 0 },
		] };

		expect(await state.actions.update(SLUG, patch)).toEqual({ ok: true, slug: SLUG });

		expect(state.images.get(product.id)).toEqual(gallery);
		expect(state.variants.get(product.id)).toEqual([
			{
				sku: "apple-iphone-17-pro-256gb",
				storage: "256 GB",
				price: 1_400_000,
				stock: 0,
			},
		]);
		expect(state.calls).toEqual([
			`product.findUnique:${SLUG}`,
			`product.update:${SLUG}`,
			"variant.update:apple-iphone-17-pro-256gb",
		]);
	});

	it("writes nothing but the row when the same save runs twice", async () => {
		const state = actionsFor(ADMIN);

		await state.actions.create(INPUT);

		const patch: AdminProductPatch = {
			name: INPUT.name,
			description: null,
			category: "IPHONE",
			published: true,
			destacado: false,
			gallery: INPUT.gallery,
			variants: [
				{ sku: "apple-iphone-17-pro-256gb", label: "256 GB", priceCents: 1_500_000, stock: 3 },
			],
		};

		await state.actions.update(SLUG, patch);

		state.calls.length = 0;

		await state.actions.update(SLUG, patch);

		expect(state.calls).toEqual([`product.findUnique:${SLUG}`, `product.update:${SLUG}`]);
	});

	it("publishes and unpublishes without touching the gallery", async () => {
		const state = actionsFor(ADMIN);

		await state.actions.create(INPUT);

		const product = storedProduct(state.products, SLUG);

		expect(await state.actions.unpublish(SLUG)).toEqual({ ok: true, slug: SLUG });
		expect(storedProduct(state.products, SLUG).published).toBe(false);

		expect(await state.actions.publish(SLUG)).toEqual({ ok: true, slug: SLUG });
		expect(storedProduct(state.products, SLUG).published).toBe(true);
		expect((state.images.get(product.id) ?? []).length).toBe(2);
	});

	it("deletes the product and its gallery", async () => {
		const state = actionsFor(ADMIN);

		await state.actions.create(INPUT);

		const product = storedProduct(state.products, SLUG);

		expect(await state.actions.remove(SLUG)).toEqual({ ok: true, slug: SLUG });
		expect(state.products.has(SLUG)).toBe(false);
		expect(state.images.has(product.id)).toBe(false);
		expect(state.variants.has(product.id)).toBe(false);
	});
});
