export type PreservedPhotographs = {
	images: string[];
	preserved: string[];
};

function isOwnedProductPath(candidate: string): boolean {
	const root = "/products/";

	if (!candidate.startsWith(root)) {
		return false;
	}

	const segments = candidate.slice(root.length).split("/");

	return segments.every(
		(segment) => segment !== "" && segment !== "." && segment !== "..",
	);
}

export function preserveLocalPhotographs(
	downloaded: readonly string[],
	previous: readonly string[] | null,
): PreservedPhotographs {
	const images: string[] = [];
	const seen = new Set<string>();

	const add = (candidate: string): boolean => {
		if (seen.has(candidate)) {
			return false;
		}

		seen.add(candidate);
		images.push(candidate);

		return true;
	};

	for (const candidate of downloaded) {
		add(candidate);
	}

	const preserved: string[] = [];

	for (const candidate of previous ?? []) {
		if (isOwnedProductPath(candidate) && add(candidate)) {
			preserved.push(candidate);
		}
	}

	return { images, preserved };
}
