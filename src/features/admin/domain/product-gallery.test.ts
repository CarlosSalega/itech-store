import { describe, expect, it } from "vitest";

import type { AdminProductImage } from "./product";
import {
	appendGalleryImage,
	blankAltIndex,
	canMoveDown,
	canMoveUp,
	editGalleryImageAlt,
	moveGalleryImageDown,
	moveGalleryImageUp,
	removeGalleryImage,
} from "./product-gallery";

function photo(url: string, position: number, alt = url): AdminProductImage {
	return { position, url, alt };
}

const THREE = [photo("a", 0), photo("b", 1), photo("c", 2)];

function urls(images: readonly AdminProductImage[]): string[] {
	return images.map((image) => image.url);
}

function positions(images: readonly AdminProductImage[]): number[] {
	return images.map((image) => image.position);
}

describe("the order the gallery writes", () => {
	it("appends the uploaded photo after the last position", () => {
		expect(appendGalleryImage([], { url: "a", alt: "A" })).toEqual([
			{ position: 0, url: "a", alt: "A" },
		]);

		const grown = appendGalleryImage(THREE, { url: "d", alt: "D" });

		expect(urls(grown)).toEqual(["a", "b", "c", "d"]);
		expect(positions(grown)).toEqual([0, 1, 2, 3]);
	});

	it("swaps a photo up and renumbers what the visitor sees", () => {
		const moved = moveGalleryImageUp(THREE, 2);

		expect(urls(moved)).toEqual(["a", "c", "b"]);
		expect(positions(moved)).toEqual([0, 1, 2]);
	});

	it("swaps a photo down and renumbers what the visitor sees", () => {
		const moved = moveGalleryImageDown(THREE, 0);

		expect(urls(moved)).toEqual(["b", "a", "c"]);
		expect(positions(moved)).toEqual([0, 1, 2]);
	});

	it("keeps the first photo from moving up and the last from moving down", () => {
		expect(canMoveUp(0)).toBe(false);
		expect(canMoveUp(1)).toBe(true);
		expect(canMoveDown(2, 3)).toBe(false);
		expect(canMoveDown(1, 3)).toBe(true);

		expect(moveGalleryImageUp(THREE, 0)).toEqual(THREE);
		expect(moveGalleryImageDown(THREE, 2)).toEqual(THREE);
	});

	it("closes the gap a removal leaves", () => {
		const kept = removeGalleryImage(THREE, 1);

		expect(urls(kept)).toEqual(["a", "c"]);
		expect(positions(kept)).toEqual([0, 1]);
		expect(removeGalleryImage(THREE, 9)).toEqual(THREE);
	});

	it("edits one photo's alt and nothing else", () => {
		const edited = editGalleryImageAlt(THREE, 1, "iPad, dorso");

		expect(edited[1]).toEqual({ position: 1, url: "b", alt: "iPad, dorso" });
		expect(urls(edited)).toEqual(["a", "b", "c"]);
		expect(positions(edited)).toEqual([0, 1, 2]);
		expect(editGalleryImageAlt(THREE, 9, "x")).toEqual(THREE);
	});

	it("names the first photo that still has no alt text", () => {
		expect(blankAltIndex([photo("a", 0), photo("b", 1, "  ")])).toBe(1);
		expect(blankAltIndex(THREE)).toBeNull();
		expect(blankAltIndex([])).toBeNull();
	});
});
