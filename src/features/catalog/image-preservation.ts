/**
 * Which photograph references survive an extraction re-run.
 *
 * The extraction scripts rewrite a whole data file from what they just downloaded, and the
 * owner adds photographs of his own into the same `images` array. A plain rewrite deletes
 * that work while reporting success, which is the worst kind of success: nothing fails, and
 * the store quietly keeps the only photographs the script happened to fetch.
 *
 * Kept separate from the scripts because it is a decision, not plumbing, and because the
 * rule has to hold in all three extraction runs.
 */

export type PreservedPhotographs = {
	/** The final array to write: what the run produced, then what it must not destroy. */
	images: string[];
	/** The entries that came from the existing file. Reported so a run can say what it kept. */
	preserved: string[];
};

/**
 * A reference this project can own: rooted at the public products directory, with no empty,
 * current or parent segment, so nothing can point outside it.
 */
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

/**
 * Merges the references a run produced with the ones already written, keeping the order the
 * owner gave his own photographs and dropping anything that is not a local product path.
 *
 * Existence is deliberately not checked here: a missing file is the seed's business, and it
 * already drops that reference rather than failing. Filtering on existence here would delete
 * a reference whenever the file was temporarily unreadable.
 */
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

	// What the run just produced owns the first slots: it is the photograph the source is
	// authoritative for, and it keeps the gallery of an untouched product stable.
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
