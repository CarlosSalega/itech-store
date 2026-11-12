import { describe, expect, it } from "vitest";

import { preserveLocalPhotographs } from "./image-preservation";

/**
 * The extraction scripts rewrite a whole data file on every run. The owner adds
 * photographs of his own into the same `images` array, so a rewrite that ignores what was
 * there deletes his work while reporting success. These cases pin the rule that decides
 * which references survive a re-run.
 *
 * Only references are handled here; whether the file exists is the seed's problem, and it
 * already drops a missing one without failing.
 */
describe("preserveLocalPhotographs", () => {
	it("returns the downloaded photographs alone when there is nothing written yet", () => {
		expect(preserveLocalPhotographs(["/products/iphone/a-1.webp"], null)).toEqual({
			images: ["/products/iphone/a-1.webp"],
			preserved: [],
		});
	});

	it("appends a photograph the extraction did not produce", () => {
		const previous = [
			"/products/iphone/a-1.webp",
			"/products/iphone/owner-photo.png",
		];

		expect(preserveLocalPhotographs(["/products/iphone/a-1.webp"], previous)).toEqual({
			images: ["/products/iphone/a-1.webp", "/products/iphone/owner-photo.png"],
			preserved: ["/products/iphone/owner-photo.png"],
		});
	});

	it("never repeats a reference that both the run and the file carry", () => {
		const previous = ["/products/iphone/a-1.webp", "/products/iphone/a-1.webp"];

		expect(preserveLocalPhotographs(["/products/iphone/a-1.webp"], previous)).toEqual({
			images: ["/products/iphone/a-1.webp"],
			preserved: [],
		});
	});

	it("keeps the order the owner gave to his own photographs", () => {
		const previous = [
			"/products/iphone/b.png",
			"/products/iphone/a-1.webp",
			"/products/iphone/c.png",
		];

		expect(preserveLocalPhotographs(["/products/iphone/a-1.webp"], previous).images).toEqual([
			"/products/iphone/a-1.webp",
			"/products/iphone/b.png",
			"/products/iphone/c.png",
		]);
	});

	it("drops a reference that is not a local product path", () => {
		const previous = [
			"https://remote.example/photo.webp",
			"/uploads/photo.webp",
			"products/relative.webp",
			"/products/iphone/kept.png",
		];

		const result = preserveLocalPhotographs([], previous);

		expect(result.images).toEqual(["/products/iphone/kept.png"]);
		expect(result.preserved).toEqual(["/products/iphone/kept.png"]);
	});

	it("drops a reference that escapes the products directory", () => {
		const previous = ["/products/../../secret.webp", "/products/iphone/kept.png"];

		expect(preserveLocalPhotographs([], previous).images).toEqual([
			"/products/iphone/kept.png",
		]);
	});

	it("is idempotent, so a second run changes nothing", () => {
		const previous = ["/products/iphone/a-1.webp", "/products/iphone/owner.png"];
		const once = preserveLocalPhotographs(["/products/iphone/a-1.webp"], previous);
		const twice = preserveLocalPhotographs(["/products/iphone/a-1.webp"], once.images);

		expect(twice.images).toEqual(once.images);
		expect(twice.preserved).toEqual(once.preserved);
	});
});
