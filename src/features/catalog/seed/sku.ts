export function storageKey(storage: string): string {
	return storage.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function skuFor(slug: string, storage: string | null): string {
	if (storage === null) return slug;

	const key = storageKey(storage);

	return key === "" ? slug : `${slug}-${key}`;
}
