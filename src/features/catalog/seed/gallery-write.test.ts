import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
	products: new Map<string, Record<string, unknown>>(),
	gallery: new Map<string, Record<string, unknown>>(),
	disconnects: 0,
	nextId: 1,
}));

vi.mock("../../../generated/prisma/client", () => {
	class PrismaClient {
		product = {
			upsert: async (args: {
				where: { slug: string };
				create: Record<string, unknown>;
				update: Record<string, unknown>;
			}) => {
				const hit = db.products.get(args.where.slug);
				if (hit) {
					Object.assign(hit, args.update);
					return hit;
				}
				const row = { id: `p${db.nextId++}`, ...args.create };
				db.products.set(args.where.slug, row);
				return row;
			},
			count: async () => db.products.size,
		};
		variant = {
			upsert: async (args: { where: { sku: string }; create: Record<string, unknown> }) => {
				const row = { id: `v${db.nextId++}`, ...args.create, sku: args.where.sku };
				return row;
			},
			count: async () => db.products.size,
		};
		productImage = {
			upsert: async (args: {
				where: { productId_position: { productId: string; position: number } };
				create: Record<string, unknown>;
				update: Record<string, unknown>;
			}) => {
				const { productId, position } = args.where.productId_position;
				const key = `${productId}:${position}`;
				const hit = db.gallery.get(key);
				if (hit) {
					Object.assign(hit, args.update);
					return hit;
				}
				const row = { id: `i${db.nextId++}`, ...args.create };
				db.gallery.set(key, row);
				return row;
			},
			deleteMany: async (args: {
				where: { productId: string; position: { gte: number } };
			}) => {
				const { productId, position } = args.where;
				let removed = 0;
				for (const [key, row] of db.gallery) {
					if (row.productId === productId && (row.position as number) >= position.gte) {
						db.gallery.delete(key);
						removed += 1;
					}
				}
				return { count: removed };
			},
		};
		$disconnect = async () => {
			db.disconnects += 1;
		};
	}
	return {
		PrismaClient,
		Category: {
			IPHONE: "IPHONE",
			MAC: "MAC",
			IPAD: "IPAD",
			WATCH: "WATCH",
			AIRPODS: "AIRPODS",
			ACCESSORY: "ACCESSORY",
		},
	};
});
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: class {} }));
vi.mock("./catalog", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./catalog")>();

	return { ...actual, resolveImages: (images: readonly string[]) => [...images] };
});

async function runSeed(): Promise<void> {
	vi.resetModules();
	db.disconnects = 0;
	const log = vi.spyOn(console, "log").mockImplementation(() => {});
	const error = vi.spyOn(console, "error").mockImplementation(() => {});
	try {
		await import("../../../../prisma/seed");
		await vi.waitFor(
			() => {
				expect(db.disconnects).toBe(1);
			},
			{ timeout: 30_000 },
		);
	} finally {
		log.mockRestore();
		error.mockRestore();
	}
}

type Stored = Record<string, unknown>;

function galleryOf(productId: string): Stored[] {
	return [...db.gallery.values()]
		.filter((row) => row.productId === productId)
		.sort((a, b) => (a.position as number) - (b.position as number));
}

function productsWithImages(): Stored[] {
	return [...db.products.values()].filter((row) => (row.images as string[]).length > 0);
}

beforeEach(() => {
	process.env.DATABASE_URL = "postgresql://probe@127.0.0.1:1/probe";
	db.products.clear();
	db.gallery.clear();
	db.nextId = 1;
});

describe("seed gallery", () => {
	it("writes one row per path, numbered from zero in the order the paths are written", async () => {
		await runSeed();

		const products = productsWithImages();

		expect(products.length).toBeGreaterThan(0);

		for (const product of products) {
			const rows = galleryOf(product.id as string);

			expect(rows.map((row) => row.position)).toEqual(rows.map((_, index) => index));
			expect(rows.map((row) => row.url)).toEqual(product.images);
			expect(product.images).toEqual(rows.map((row) => row.url));
		}
	});

	it("gives every row an alt built from the product name and its index", async () => {
		await runSeed();

		const product = productsWithImages().find((row) => (row.images as string[]).length > 1);
		const rows = galleryOf(product!.id as string);

		expect(rows[0]?.alt).toBe(`${product!.name} — foto principal`);
		expect(rows[1]?.alt).toBe(`${product!.name} — foto 2`);
		expect(rows[rows.length - 1]?.alt).toBe(`${product!.name} — foto ${rows.length}`);
		expect(rows.every((row) => typeof row.alt === "string" && row.alt.length > 0)).toBe(true);
	});

	it("a second run leaves the same rows", async () => {
		await runSeed();
		const first = [...db.gallery.entries()].sort(([a], [b]) => a.localeCompare(b));

		expect(first.length).toBeGreaterThan(0);

		await runSeed();

		expect([...db.gallery.entries()].sort(([a], [b]) => a.localeCompare(b))).toEqual(first);
	});

	it("a second run drops a row left past the end of the paths", async () => {
		await runSeed();
		const product = productsWithImages()[0]!;
		const before = galleryOf(product.id as string);
		db.gallery.set(`${product.id}:99`, {
			id: "stale",
			productId: product.id,
			position: 99,
			alt: "sobra",
			url: "/products/stale.webp",
		});

		await runSeed();

		expect(galleryOf(product.id as string)).toEqual(before);
	});
});
