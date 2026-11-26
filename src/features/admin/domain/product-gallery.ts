import type { AdminProductImage } from "./product";

function withPositions(images: readonly AdminProductImage[]): AdminProductImage[] {
	return images.map((image, position) => ({ ...image, position }));
}

export function appendGalleryImage(
	images: readonly AdminProductImage[],
	photo: { readonly url: string; readonly alt: string },
): AdminProductImage[] {
	return withPositions([...images, { position: images.length, ...photo }]);
}

export function canMoveUp(index: number): boolean {
	return index > 0;
}

export function canMoveDown(index: number, total: number): boolean {
	return index >= 0 && index < total - 1;
}

function swapped(
	images: readonly AdminProductImage[],
	index: number,
	target: number,
): AdminProductImage[] {
	if (index < 0 || index >= images.length || target < 0 || target >= images.length) {
		return [...images];
	}

	const next = [...images];
	const held = next[index];

	next[index] = next[target] as AdminProductImage;
	next[target] = held as AdminProductImage;

	return withPositions(next);
}

export function moveGalleryImageUp(
	images: readonly AdminProductImage[],
	index: number,
): AdminProductImage[] {
	return canMoveUp(index) ? swapped(images, index, index - 1) : [...images];
}

export function moveGalleryImageDown(
	images: readonly AdminProductImage[],
	index: number,
): AdminProductImage[] {
	return canMoveDown(index, images.length) ? swapped(images, index, index + 1) : [...images];
}

export function removeGalleryImage(
	images: readonly AdminProductImage[],
	index: number,
): AdminProductImage[] {
	if (index < 0 || index >= images.length) {
		return [...images];
	}

	return withPositions(images.filter((_, position) => position !== index));
}

export function editGalleryImageAlt(
	images: readonly AdminProductImage[],
	index: number,
	alt: string,
): AdminProductImage[] {
	if (index < 0 || index >= images.length) {
		return [...images];
	}

	return images.map((image, position) => (position === index ? { ...image, alt } : image));
}

export function blankAltIndex(images: readonly AdminProductImage[]): number | null {
	const index = images.findIndex((image) => image.alt.trim() === "");

	return index === -1 ? null : index;
}
