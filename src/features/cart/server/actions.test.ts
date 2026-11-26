import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidateCart } from "./actions";

type GalleryRow = { position: number; url: string; alt: string };

type VariantRow = {
	id: string;
	sku: string;
	storage: string | null;
	color: string | null;
	price: number;
	stock: number;
	product: {
		slug: string;
		name: string;
		category: "IPHONE" | "MAC" | "IPAD" | "WATCH" | "AIRPODS" | "ACCESSORY";
		gallery: GalleryRow[];
	};
};

type GalleryArgs = {
	orderBy?: { position?: "asc" | "desc" };
	take?: number;
};

const db = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("@/lib/prisma", () => {
	const readGallery = (rows: GalleryRow[], args?: GalleryArgs): GalleryRow[] => {
		const ordered = [...rows];
		const direction = args?.orderBy?.position;

		if (direction !== undefined) {
			ordered.sort((first, second) =>
				direction === "desc"
					? second.position - first.position
					: first.position - second.position,
			);
		}

		return args?.take === undefined ? ordered : ordered.slice(0, args.take);
	};

	return {
		prisma: {
			variant: {
				findMany: async (args: {
					select: { product: { select: { gallery?: GalleryArgs } } };
				}) => {
					const gallery = args.select.product.select.gallery;
					const rows = db.rows as VariantRow[];

					return rows.map((row) => ({
						...row,
						product: {
							...row.product,
							gallery: readGallery(row.product.gallery, gallery),
						},
					}));
				},
			},
		},
	};
});

beforeEach(() => {
	db.rows = [
		{
			id: "v-iphone-256",
			sku: "iphone-17-256-negro",
			storage: "256 GB",
			color: "Negro",
			price: 150000000,
			stock: 3,
			product: {
				slug: "iphone-17",
				name: "iPhone 17",
				category: "IPHONE",
				gallery: [
					{
						position: 2,
						url: "/products/iphone/iphone-17-3.webp",
						alt: "iPhone 17 — foto 3",
					},
					{
						position: 0,
						url: "/products/iphone/iphone-17-1.webp",
						alt: "iPhone 17 — foto principal",
					},
					{
						position: 1,
						url: "/products/iphone/iphone-17-2.webp",
						alt: "iPhone 17 — foto 2",
					},
				],
			},
		},
	];
});

describe("revalidateCart", () => {
	it("snapshots the first image by position as the line's image", async () => {
		const result = await revalidateCart(["v-iphone-256"]);

		expect(result.ok).toBe(true);
		expect(result.ok && result.variants[0].imageUrl).toBe(
			"/products/iphone/iphone-17-1.webp",
		);
	});

	it("keeps the label it already built for the snapshot", async () => {
		const result = await revalidateCart(["v-iphone-256"]);

		expect(result.ok && result.variants[0].imageAlt).toBe(
			"iPhone 17, 256 GB · Negro",
		);
	});
});
