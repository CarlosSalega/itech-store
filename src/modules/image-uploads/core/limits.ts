export const IMAGE_UPLOAD_LIMITS = Object.freeze({
	maxBytes: 5 * 1024 * 1024,
	allowedMimeTypes: Object.freeze([
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/avif",
	] as const),
});
