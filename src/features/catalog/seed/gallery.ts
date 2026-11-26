export type GalleryRow = {
	position: number;
	alt: string;
	url: string;
};

export function galleryAlt(name: string, position: number): string {
	return position === 0 ? `${name} — foto principal` : `${name} — foto ${position + 1}`;
}

export function buildGallery(name: string, images: readonly string[]): GalleryRow[] {
	return images.map((url, position) => ({
		position,
		alt: galleryAlt(name, position),
		url,
	}));
}
