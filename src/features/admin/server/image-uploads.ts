import { galleryAlt } from "@/features/catalog/seed/gallery";
import { authorizeProductImageDelete, ImageError } from "@/modules/image-uploads";
import type { DeleteDecision, ProductRef } from "@/modules/image-uploads";
import type {
	DeleteUploadArgs,
	RecordedImage,
	RecordUploadArgs,
} from "@/modules/image-uploads/next";

/**
 * Everything this side of the transport needs from Postgres, expressed as the
 * questions it asks. The Prisma implementation lives next to it; the tests
 * replace it, so none of them reaches a database.
 */
export interface ImageUploadStore {
	/** One row per key. A repeated key never steals the first owner. */
	recordUpload(args: { readonly key: string; readonly userId: string }): Promise<void>;
	forgetUpload(key: string): Promise<void>;
	findProduct(productId: string): Promise<ProductRef | null>;
	findProductImage(args: {
		readonly productId: string;
		readonly url: string;
	}): Promise<RecordedImage | null>;
	listGalleryPositions(productId: string): Promise<readonly number[]>;
	createProductImage(args: {
		readonly productId: string;
		readonly position: number;
		readonly alt: string;
		readonly url: string;
	}): Promise<RecordedImage>;
	/** The products whose gallery holds this key; the ownership rule reads the first. */
	listProductsByImage(key: string): Promise<readonly ProductRef[]>;
}

export const FIRST_GALLERY_POSITION = 0;

/**
 * A gallery appends: the new photo follows the last one, so a position freed
 * by an earlier removal is never written over.
 */
export function nextGalleryPosition(positions: readonly number[]): number {
	if (positions.length === 0) return FIRST_GALLERY_POSITION;

	return Math.max(...positions) + 1;
}

/**
 * Records an upload the browser already made. The asset row is written first
 * because the asset exists whether or not a gallery row follows it; the
 * gallery row is written once per product and url, so recording the same key
 * twice leaves one row at the position it first took.
 */
export async function recordImageUpload(
	input: RecordUploadArgs,
	store: ImageUploadStore,
): Promise<{ image: RecordedImage | null }> {
	await store.recordUpload({ key: input.key, userId: input.actor.id });

	if (input.productId === null) return { image: null };

	const product = await store.findProduct(input.productId);

	if (product === null) {
		throw new ImageError("NOT_FOUND", { details: { productId: input.productId } });
	}

	const listed = await store.findProductImage({ productId: product.id, url: input.url });

	if (listed !== null) return { image: listed };

	const position = nextGalleryPosition(await store.listGalleryPositions(product.id));
	const alt = input.alt ?? galleryAlt(product.name, position);

	const image = await store.createProductImage({
		productId: product.id,
		position,
		alt,
		url: input.url,
	});

	return { image };
}

/**
 * The ownership rule, with the two facts it needs. A key no product lists is
 * an orphan an admin may remove; a key the panel's own product lists is
 * removable from there; a key any other product lists is refused with the
 * guard's sentence, and a delete that names no product can only remove an
 * orphan.
 */
export async function authorizeImageUploadDelete(
	{ key, productId }: DeleteUploadArgs,
	store: ImageUploadStore,
): Promise<DeleteDecision> {
	const [listedBy = null] = await store.listProductsByImage(key);

	return authorizeProductImageDelete({ target: deleteTarget(productId), listedBy });
}

/**
 * The rule compares product ids, so the target carries the id the request
 * names and nothing else: a request that names no product can match no
 * listing, which leaves the orphan as the only key it may remove.
 */
function deleteTarget(productId: string | null): ProductRef {
	return { id: productId ?? "", name: "" };
}
