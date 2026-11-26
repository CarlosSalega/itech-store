import type { Category } from "@/generated/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	countByFamily,
	countProducts,
	findProductBySlug,
	listFeaturedProducts,
	listProducts,
	listRelatedProducts,
} from "./catalog-queries";

type GalleryRow = { position: number; alt: string; url: string };

type VariantRow = {
	id: string;
	sku: string;
	storage: string | null;
	color: string | null;
	price: number;
	stock: number;
};

type FakeProduct = {
	slug: string;
	name: string;
	description: string;
	category: Category;
	published: boolean;
	featured: boolean;
	gallery: GalleryRow[];
	variants: VariantRow[];
};

type Where = {
	published?: boolean;
	featured?: boolean;
	category?: Category;
	slug?: string | { not: string };
};

type OrderBy = { name?: "asc" | "desc"; slug?: "asc" | "desc" };

type NestedGallery = { orderBy?: { position?: "asc" | "desc" }; take?: number };

type Select = { gallery?: NestedGallery };

type FindArgs = {
	where?: Where;
	select?: Select;
	orderBy?: OrderBy;
	skip?: number;
	take?: number;
};

const db = vi.hoisted(() => ({ products: [] as unknown[] }));

vi.mock("@/lib/prisma", () => {
	const products = (): FakeProduct[] => db.products as FakeProduct[];

	const matches = (product: FakeProduct, where: Where = {}): boolean => {
		if (where.published !== undefined && product.published !== where.published) {
			return false;
		}
		if (where.featured !== undefined && product.featured !== where.featured) {
			return false;
		}
		if (where.category !== undefined && product.category !== where.category) {
			return false;
		}
		if (typeof where.slug === "string" && product.slug !== where.slug) {
			return false;
		}
		if (
			typeof where.slug === "object" &&
			product.slug === where.slug.not
		) {
			return false;
		}

		return true;
	};

	const readGallery = (
		rows: GalleryRow[],
		options?: NestedGallery,
	): GalleryRow[] => {
		const ordered = [...rows];
		const direction = options?.orderBy?.position;

		if (direction !== undefined) {
			ordered.sort((first, second) =>
				direction === "desc"
					? second.position - first.position
					: first.position - second.position,
			);
		}

		return options?.take === undefined ? ordered : ordered.slice(0, options.take);
	};

	const find = (args: FindArgs = {}): FakeProduct[] => {
		const rows = products()
			.filter((product) => matches(product, args.where))
			.map((product) => ({
				...product,
				variants: [...product.variants],
				gallery: readGallery(product.gallery, args.select?.gallery),
			}));

		const orderBy = args.orderBy;
		const field = orderBy?.name === undefined ? orderBy?.slug : orderBy.name;
		const key = orderBy?.name === undefined ? "slug" : "name";

		if (field !== undefined) {
			rows.sort((first, second) =>
				field === "desc"
					? second[key].localeCompare(first[key])
					: first[key].localeCompare(second[key]),
			);
		}

		const skip = args.skip ?? 0;

		return args.take === undefined
			? rows.slice(skip)
			: rows.slice(skip, skip + args.take);
	};

	return {
		prisma: {
			product: {
				findMany: async (args: FindArgs = {}) => find(args),
				findFirst: async (args: FindArgs = {}) => find(args)[0] ?? null,
				count: async ({ where }: { where?: Where } = {}) =>
					products().filter((product) => matches(product, where)).length,
				groupBy: async ({ where }: { where?: Where } = {}) => {
					const counts = new Map<Category, number>();

					for (const product of products()) {
						if (!matches(product, where)) continue;
						counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
					}

					return [...counts].map(([category, count]) => ({
						category,
						_count: { _all: count },
					}));
				},
			},
		},
	};
});

function galleryRows(urls: readonly string[], alt: (index: number) => string) {
	return urls.map((url, index) => ({ position: index, alt: alt(index), url }));
}

beforeEach(() => {
	db.products = [
		{
			slug: "iphone-17",
			name: "iPhone 17",
			description: "El iPhone 17, con chip A19.",
			category: "IPHONE",
			published: true,
			featured: true,
			gallery: [
				{
					position: 2,
					alt: "iPhone 17 — foto 3",
					url: "/products/iphone/iphone-17-3.webp",
				},
				{
					position: 0,
					alt: "iPhone 17 — foto principal",
					url: "/products/iphone/iphone-17-1.webp",
				},
				{
					position: 1,
					alt: "iPhone 17 — foto 2",
					url: "/products/iphone/iphone-17-2.webp",
				},
			],
			variants: [
				{
					id: "v-iphone-256",
					sku: "iphone-17-256-negro",
					storage: "256 GB",
					color: "Negro",
					price: 150000000,
					stock: 3,
				},
			],
		},
		{
			slug: "iphone-17-borrador",
			name: "iPhone 17 borrador",
			description: "Todavía sin publicar.",
			category: "IPHONE",
			published: false,
			featured: true,
			gallery: galleryRows(["/products/iphone/borrador-1.webp"], () => "Borrador"),
			variants: [
				{
					id: "v-borrador",
					sku: "iphone-17-borrador-256",
					storage: "256 GB",
					color: "Negro",
					price: 150000000,
					stock: 1,
				},
			],
		},
		{
			slug: "macbook-air",
			name: "MacBook Air",
			description: "La MacBook Air, con chip M5.",
			category: "MAC",
			published: true,
			featured: false,
			gallery: [],
			variants: [
				{
					id: "v-mac",
					sku: "macbook-air-13-m5",
					storage: "512 GB",
					color: "Medianoche",
					price: 200000000,
					stock: 2,
				},
			],
		},
		{
			slug: "macbook-air-borrador",
			name: "MacBook Air borrador",
			description: "Todavía sin publicar.",
			category: "MAC",
			published: false,
			featured: false,
			gallery: galleryRows(["/products/mac/borrador-1.webp"], () => "Borrador"),
			variants: [],
		},
	];
});

describe("the public catalogue reads only published products", () => {
	it("leaves an unpublished product out of the catalogue list", async () => {
		const cards = await listProducts(null, 0, 10);

		expect(cards.map((card) => card.slug)).toEqual(["iphone-17", "macbook-air"]);
	});

	it("leaves an unpublished product out of a family listing and its count", async () => {
		const cards = await listProducts("MAC", 0, 10);

		expect(cards.map((card) => card.slug)).toEqual(["macbook-air"]);
		expect(await countProducts("MAC")).toBe(1);
		expect(await countProducts(null)).toBe(2);
	});

	it("counts published products per family", async () => {
		expect(await countByFamily()).toEqual({
			MAC: 1,
			IPAD: 0,
			WATCH: 0,
			AIRPODS: 0,
			ACCESSORY: 0,
			IPHONE: 1,
		});
	});

	it("keeps the landing wall to published featured products", async () => {
		const cards = await listFeaturedProducts();

		expect(cards.map((card) => card.slug)).toEqual(["iphone-17"]);
	});

	it("finds nothing for an unpublished slug", async () => {
		expect(await findProductBySlug("iphone-17-borrador")).toBeNull();
	});

	it("keeps unpublished products out of the related wall", async () => {
		const related = await listRelatedProducts("IPHONE", "iphone-17", 4);

		expect(related.map((card) => card.slug)).toEqual([]);
	});
});

describe("the public catalogue reads the gallery", () => {
	it("takes the first image by position and carries its alt", async () => {
		const [card] = await listProducts(null, 0, 1);

		expect(card.image).toBe("/products/iphone/iphone-17-1.webp");
		expect(card.imageAlt).toBe("iPhone 17 — foto principal");
	});

	it("leaves a product without a gallery without an image and without an alt", async () => {
		const cards = await listProducts(null, 0, 10);
		const mac = cards.find((card) => card.slug === "macbook-air");

		expect(mac?.image).toBeNull();
		expect(mac?.imageAlt).toBeNull();
	});

	it("returns the product page's gallery in position order", async () => {
		const product = await findProductBySlug("iphone-17");

		expect(product?.gallery.map((row) => row.url)).toEqual([
			"/products/iphone/iphone-17-1.webp",
			"/products/iphone/iphone-17-2.webp",
			"/products/iphone/iphone-17-3.webp",
		]);
		expect(product?.gallery[0].alt).toBe("iPhone 17 — foto principal");
	});
});
