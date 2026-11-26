import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

type Upsert<K extends string> = {
	where: Record<K, string>;
	create: Record<string, unknown>;
	update: Record<string, unknown>;
};

const db = vi.hoisted(() => ({
	products: new Map<string, Record<string, unknown>>(),
	productUpserts: [] as Upsert<"slug">[],
	variants: new Map<string, Record<string, unknown>>(),
	gallery: new Map<string, Record<string, unknown>>(),
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
			upsert: async (args: Upsert<"sku">) => {
				const hit = db.variants.get(args.where.sku);
				if (hit) {
					Object.assign(hit, args.update);
					return hit;
				}
				const row = { id: `v${db.nextId++}`, ...args.create };
				db.variants.set(args.where.sku, row);
				return row;
			},
			count: async () => db.variants.size,
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

const SEED_DIR = path.join(process.cwd(), "prisma", "seed");

function expectedFeatured(): string[] {
	const rows = ["products.json", "products-iphone.json"]
		.filter((file) => existsSync(path.join(SEED_DIR, file)))
		.flatMap((file) => JSON.parse(readFileSync(path.join(SEED_DIR, file), "utf8")) as Array<{
			slug: string;
			category: string;
		}>);
	const first = new Map<string, string>();
	for (const row of [...rows].sort((a, b) => a.slug.localeCompare(b.slug))) {
		if (!first.has(row.category)) {
			first.set(row.category, row.slug);
		}
	}

	return [...first.values()].sort();
}

async function runSeed(): Promise<void> {
	vi.resetModules();
	db.disconnects = 0;
	db.productUpserts.length = 0;
	const log = vi.spyOn(console, "log").mockImplementation(() => {});
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
	}
}

const featuredRows = () =>
	[...db.products.values()]
		.filter((row) => row.featured === true)
		.map((row) => row.slug as string)
		.sort();

beforeEach(() => {
	process.env.DATABASE_URL = "postgresql://probe@127.0.0.1:1/probe";
	db.products.clear();
	db.variants.clear();
	db.gallery.clear();
	db.nextId = 1;
});

describe("seed featured flag", () => {
	it("a fresh seed writes featured on create, one product per family", async () => {
		await runSeed();

		const createdFeatured = db.productUpserts
			.filter((upsert) => upsert.create.featured === true)
			.map((upsert) => upsert.where.slug)
			.sort();

		expect(createdFeatured).toEqual(expectedFeatured());
		expect(db.productUpserts.every((upsert) => typeof upsert.create.featured === "boolean")).toBe(true);
	});

	it("the update path never carries featured, so a re-run cannot write it", async () => {
		await runSeed();
		await runSeed();

		expect(db.productUpserts.filter((upsert) => "featured" in upsert.update)).toEqual([]);
	});

	it("a re-run keeps a manual change to featured instead of reverting it", async () => {
		await runSeed();
		const picked = featuredRows();
		const manualOff = picked[0] as string;
		const manualOn = [...db.products.keys()].find((slug) => !picked.includes(slug)) as string;
		db.products.get(manualOff)!.featured = false;
		db.products.get(manualOn)!.featured = true;

		await runSeed();

		expect(db.products.get(manualOff)!.featured).toBe(false);
		expect(db.products.get(manualOn)!.featured).toBe(true);
	});
});
