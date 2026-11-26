export type ProductImageRow = {
	position: number;
	alt: string;
	url: string;
};

export type ProductImageDelegate = {
	findMany(args: {
		where: { productId: string };
		orderBy: { position: "asc" };
	}): Promise<readonly ProductImageRow[]>;
	create(args: {
		data: { productId: string; position: number; alt: string; url: string };
	}): Promise<unknown>;
	update(args: {
		where: { productId_position: { productId: string; position: number } };
		data: { alt: string; url: string };
	}): Promise<unknown>;
	deleteMany(args: {
		where: { productId: string; position: { in: number[] } };
	}): Promise<unknown>;
};

export async function reconcileProductGallery(
	delegate: ProductImageDelegate,
	productId: string,
	gallery: readonly ProductImageRow[],
): Promise<void> {
	const wanted = new Map(gallery.map((image) => [image.position, image]));
	const stored = await delegate.findMany({
		where: { productId },
		orderBy: { position: "asc" },
	});
	const byPosition = new Map(stored.map((row) => [row.position, row]));

	for (const position of [...wanted.keys()].sort((first, second) => first - second)) {
		const image = wanted.get(position);

		if (image === undefined) {
			continue;
		}

		const current = byPosition.get(position);

		if (current === undefined) {
			await delegate.create({
				data: { productId, position, alt: image.alt, url: image.url },
			});
			continue;
		}

		if (current.alt === image.alt && current.url === image.url) {
			continue;
		}

		await delegate.update({
			where: { productId_position: { productId, position } },
			data: { alt: image.alt, url: image.url },
		});
	}

	const stale = stored
		.filter((row) => !wanted.has(row.position))
		.map((row) => row.position);

	if (stale.length > 0) {
		await delegate.deleteMany({ where: { productId, position: { in: stale } } });
	}
}
