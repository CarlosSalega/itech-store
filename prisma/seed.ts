import "dotenv/config";

import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { Category, PrismaClient } from "../src/generated/prisma/client";
import { alreadyRegistered } from "../src/lib/auth-errors";
import { getAuth } from "../src/lib/auth";
import { buildSeedCatalog, resolveImages, type SeedProduct, type SeedVariant } from "../src/features/catalog/seed/catalog";
import { buildGallery } from "../src/features/catalog/seed/gallery";

const SEED_DIR = path.join(process.cwd(), "prisma", "seed");

const CATEGORY_BASE_CENTS: Record<Category, number> = {
	IPHONE: 150_000_000,
	MAC: 200_000_000,
	IPAD: 90_000_000,
	WATCH: 60_000_000,
	AIRPODS: 25_000_000,
	ACCESSORY: 3_000_000,
};

const STORAGE_MULTIPLIER: Record<string, number> = {
	"128GB": 1.0,
	"256GB": 1.15,
	"512GB": 1.35,
	"1TB": 1.6,
	"2TB": 1.9,
};

function storageMultiplier(storage: string | null): number {
	if (storage === null) return 1.0;
	const key = storage.trim().toUpperCase();
	return Object.hasOwn(STORAGE_MULTIPLIER, key)
		? STORAGE_MULTIPLIER[key]
		: 1.0;
}

function priceInCents(product: SeedProduct, variant: SeedVariant): number {
	return Math.round(
		CATEGORY_BASE_CENTS[product.category] * storageMultiplier(variant.storage),
	);
}

function stockForSku(sku: string): number {
	let sum = 0;
	for (const char of sku) sum += char.codePointAt(0) ?? 0;
	return (sum % 8) + 1;
}

function formatArs(cents: number): string {
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		maximumFractionDigits: 2,
	}).format(cents / 100);
}

const ADMIN_NAME = "Administrador";

async function ensureAdmin(prisma: PrismaClient): Promise<void> {
	const email = process.env["ADMIN_EMAIL"]?.trim();
	const password = process.env["ADMIN_PASSWORD"];

	if (!email || !password) {
		const missing = [
			email ? null : "ADMIN_EMAIL",
			password ? null : "ADMIN_PASSWORD",
		].filter((name) => name !== null);

		console.log(
			`Admin user skipped: ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not set.`,
		);
		return;
	}

	try {
		await getAuth().api.signUpEmail({
			body: { email, password, name: ADMIN_NAME },
		});
	} catch (error) {
		if (!alreadyRegistered(error)) throw error;
	}

	await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });

	console.log(`Admin user ready: ${email} (role ADMIN)`);
}

async function main() {
	const connectionString = process.env["DATABASE_URL"];
	if (!connectionString) {
		throw new Error("DATABASE_URL is not set; cannot seed the database.");
	}

	const prisma = new PrismaClient({
		adapter: new PrismaPg({ connectionString }),
	});

	const { products: catalog, featured } = buildSeedCatalog(SEED_DIR);

	let productsUpserted = 0;
	let variantsUpserted = 0;
	let galleryWritten = 0;
	let imagesKept = 0;
	let imagesDropped = 0;
	let minPrice = Number.POSITIVE_INFINITY;
	let maxPrice = Number.NEGATIVE_INFINITY;

	try {
		for (const product of catalog) {
			const images = resolveImages(product.images);
			imagesKept += images.length;
			imagesDropped += product.images.length - images.length;

			const productData = {
				name: product.name,
				description: product.description,
				category: product.category,
				images,
			};

			const record = await prisma.product.upsert({
				where: { slug: product.slug },
				create: {
					slug: product.slug,
					...productData,
					featured: featured.has(product.slug),
				},
				update: productData,
			});
			productsUpserted += 1;

			const gallery = buildGallery(product.name, images);

			await prisma.productImage.deleteMany({
				where: { productId: record.id, position: { gte: gallery.length } },
			});

			for (const image of gallery) {
				await prisma.productImage.upsert({
					where: { productId_position: { productId: record.id, position: image.position } },
					create: { productId: record.id, ...image },
					update: { alt: image.alt, url: image.url },
				});
				galleryWritten += 1;
			}

			for (const variant of product.variants) {
				const price = priceInCents(product, variant);
				const stock = stockForSku(variant.sku);
				const variantData = {
					productId: record.id,
					storage: variant.storage,
					price,
					stock,
				};

				await prisma.variant.upsert({
					where: { sku: variant.sku },
					create: { sku: variant.sku, ...variantData },
					update: variantData,
				});
				variantsUpserted += 1;

				minPrice = Math.min(minPrice, price);
				maxPrice = Math.max(maxPrice, price);
			}
		}

		const [storedProducts, storedVariants] = await Promise.all([
			prisma.product.count(),
			prisma.variant.count(),
		]);

		await ensureAdmin(prisma);

		console.log("Seed summary (sample prices and stock, not real data)");
		console.log(`Products upserted: ${productsUpserted}`);
		console.log(`Variants upserted: ${variantsUpserted}`);
		console.log(`Featured applied on create: ${[...featured].sort().join(", ")}`);
		console.log(
			`Price range written: ${formatArs(minPrice)} - ${formatArs(maxPrice)} ` +
				`(${minPrice}-${maxPrice} cents)`,
		);
		console.log(`Totals now in database: ${storedProducts} products, ${storedVariants} variants`);
		console.log(
			`Images kept: ${imagesKept}` +
				(imagesDropped > 0
					? `, dropped ${imagesDropped} whose file is missing (the UI falls back to /placeholder.webp)`
					: ""),
		);
		console.log(`Gallery rows written: ${galleryWritten}`);
	} finally {
		await prisma.$disconnect();
	}
}

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
