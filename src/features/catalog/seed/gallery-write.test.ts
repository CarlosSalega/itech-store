import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveImages } from "./catalog";

type Upsert<K extends string> = {
	where: Record<K, string>;
	create: Record<string, unknown>;
	update: Record<string, unknown>;
};

const SEED_DIR = path.join(process.cwd(), "prisma", "seed");
const SEED_FILES = ["products.json", "products-iphone.json", "products-apple.json"];

const db = vi.hoisted(() => ({
	products: new Map<string, Record<string, unknown>>(),
	gallery: new Map<string, Record<string, unknown>>(),
	productUpserts: [] as Upsert<"slug">[],
	disconnects: 0,
	nextId: 1,
}));

vi.mock("../../../generated/prisma/client", () => {
	class PrismaClient {
		product = {
			upsert: async (args: Upsert<"slug">) => {
				db.productUpserts.push(args);
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
	db.productUpserts.length = 0;
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

function seededPaths(): Map<string, string[]> {
	const rows = SEED_FILES.filter((file) => existsSync(path.join(SEED_DIR, file))).flatMap(
		(file) =>
			JSON.parse(readFileSync(path.join(SEED_DIR, file), "utf8")) as Array<{
				slug: string;
				images: string[];
			}>,
	);

	return new Map(rows.map((row) => [row.slug, resolveImages(row.images)]));
}

function productNamed(): Stored[] {
	return [...db.products.values()];
}

beforeEach(() => {
	process.env.DATABASE_URL = "postgresql://probe@127.0.0.1:1/probe";
	db.products.clear();
	db.gallery.clear();
	db.nextId = 1;
});

describe("seed gallery", () => {
	it("writes one row per path from the seed source, numbered from zero in order", async () => {
		await runSeed();

		const expected = seededPaths();

		expect(expected.size).toBeGreaterThan(0);

		for (const [slug, paths] of expected) {
			const product = db.products.get(slug);

			expect(product).toBeDefined();

			const rows = galleryOf(product!.id as string);

			expect(rows.map((row) => row.url)).toEqual(paths);
			expect(rows.map((row) => row.position)).toEqual(paths.map((_, index) => index));
		}
	});

	it("never sends the images array to the product write, only the gallery carries them", async () => {
		await runSeed();

		expect(db.productUpserts.length).toBeGreaterThan(0);

		for (const upsert of db.productUpserts) {
			expect(upsert.create).not.toHaveProperty("images");
			expect(upsert.update).not.toHaveProperty("images");
		}

		expect(db.gallery.size).toBeGreaterThan(0);
	});

	it("gives every row an alt built from the product name and its index", async () => {
		await runSeed();

		const product = productNamed().find((row) => galleryOf(row.id as string).length > 1);
		const rows = galleryOf(product!.id as string);

		expect(rows[0]?.alt).toBe(`${product!.name} — foto principal`);
		expect(rows[1]?.alt).toBe(`${product!.name} — foto 2`);
		expect(rows[rows.length - 1]?.alt).toBe(`${product!.name} — foto ${rows.length}`);
		expect(rows.every((row) => typeof row.alt === "string" && row.alt.length > 0)).toBe(true);
	});

	it("writes no row at all for a product whose photos resolve to nothing", async () => {
		await runSeed();

		const empty = [...seededPaths()].filter(([, paths]) => paths.length === 0);

		expect(empty.length).toBeGreaterThan(0);

		for (const [slug] of empty) {
			const product = db.products.get(slug);

			expect(product).toBeDefined();
			expect(galleryOf(product!.id as string)).toEqual([]);
		}
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
		const product = productNamed().find((row) => galleryOf(row.id as string).length > 0)!;
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
