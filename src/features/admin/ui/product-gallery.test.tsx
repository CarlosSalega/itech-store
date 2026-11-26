import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { imageErrorMessage } from "@/modules/image-uploads/core";

import type { AdminProductImage } from "../domain/product";
import { uploadProductImage } from "./image-upload";
import { GalleryPhotos, GALLERY_FILE_ID, GALLERY_MESSAGE_ID, ProductGallery } from "./product-gallery";
import type { GalleryPhotosProps } from "./product-gallery";

const noop = () => undefined;

const manifest = JSON.parse(
	readFileSync(new URL("../../../../package.json", import.meta.url), "utf8"),
) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };

const stylesheet = readFileSync(
	new URL("./product-form.module.css", import.meta.url),
	"utf8",
);

function rule(selector: string): string {
	const match = new RegExp(`${selector.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`).exec(
		stylesheet,
	);

	return match?.[1] ?? "";
}

function photo(url: string, position: number, alt = `foto ${position + 1}`): AdminProductImage {
	return { position, url, alt };
}

const THREE = [photo("/fotos/a.webp", 0), photo("/fotos/b.webp", 1), photo("/fotos/c.webp", 2)];

function render(overrides: Partial<GalleryPhotosProps> = {}): string {
	return renderToStaticMarkup(
		<GalleryPhotos
			images={[]}
			message={undefined}
			onAltChange={noop}
			onMoveDown={noop}
			onMoveUp={noop}
			onPick={noop}
			onRemove={noop}
			uploading={false}
			{...overrides}
		/>,
	);
}

type Button = { readonly disabled: boolean; readonly label: string };

function buttons(markup: string): Button[] {
	return [...markup.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)].map((match) => ({
		disabled: (match[1] ?? "").includes("disabled"),
		label: (match[2] ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
	}));
}

describe("the photos the form keeps", () => {
	it("says the catalogue falls back to the sample image while there is none", () => {
		const markup = render();

		expect(markup).toContain("0 fotos · la primera es la portada");
		expect(markup).toContain(
			"Todavía no hay fotos: el catálogo usa la imagen de muestra hasta que subas una.",
		);
	});

	it("offers one file picker, described by the lane, with the types the module accepts", () => {
		const markup = render();

		expect(markup).toContain(`id="${GALLERY_FILE_ID}"`);
		expect(markup).toContain('type="file"');
		expect(markup).toContain('accept="image/jpeg,image/png,image/webp,image/avif"');
		expect(markup).toContain(`aria-describedby="${GALLERY_MESSAGE_ID}"`);
		expect(markup).toContain("Elegir una foto");
	});

	it("names the photo being uploaded while the request is in flight", () => {
		const markup = render({ uploading: true });

		expect(markup).toContain("Subiendo la foto…");
		expect(markup).toContain("disabled");
	});
});

describe("the controls the gallery offers", () => {
	it("names every control in text, one per photo", () => {
		expect(buttons(render({ images: THREE })).map((button) => button.label)).toEqual([
			"Subir la foto 1",
			"Bajar la foto 1",
			"Quitar la foto 1",
			"Subir la foto 2",
			"Bajar la foto 2",
			"Quitar la foto 2",
			"Subir la foto 3",
			"Bajar la foto 3",
			"Quitar la foto 3",
		]);
	});

	it("disables the first up and the last down", () => {
		const disabled = buttons(render({ images: THREE }))
			.filter((button) => button.disabled)
			.map((button) => button.label);

		expect(disabled).toEqual(["Subir la foto 1", "Bajar la foto 3"]);
	});

	it("gives every control a 44px target", () => {
		expect(rule(".move")).toContain("min-width: 44px");
		expect(rule(".move")).toContain("min-height: 44px");
		expect(rule(".uploadPick")).toContain("min-height: 44px");
	});

	it("lets the alt text be edited, one field per photo", () => {
		const markup = render({ images: THREE });

		expect(markup.match(/Texto alternativo/g) ?? []).toHaveLength(3);
		expect(markup).toContain('id="foto-alt-2"');
		expect(markup).toContain('value="foto 3"');
	});
});

describe("the lane the gallery reports into", () => {
	it("renders one empty polite lane with no message", () => {
		const markup = render();

		expect(markup.match(/aria-live="polite"/g) ?? []).toHaveLength(1);
		expect(markup).toContain(`id="${GALLERY_MESSAGE_ID}"`);
	});

	it("shows the module's sentence after a refused upload", async () => {
		const refusal = await uploadProductImage({
			file: new File([new Uint8Array([1])], "foto.webp", { type: "image/webp" }),
			scope: "apple-ipad-pro",
			alt: "iPad Pro",
			send: async () => Response.json({ error: "No autorizado" }, { status: 401 }),
		}).then(
			() => "no refusal",
			(error: Error) => error.message,
		);

		const markup = render({ message: refusal });

		expect(refusal).toBe(imageErrorMessage("UNAUTHENTICATED"));
		expect(markup).toContain("No autorizado");
	});

	it("shows the error the form passes down when a photo has no alt text", () => {
		const markup = render({ message: "Para guardar falta el texto alternativo de la foto 1." });

		expect(markup).toContain("Para guardar falta el texto alternativo de la foto 1.");
	});
});

describe("the gallery the screen mounts", () => {
	it("starts empty and needs no drag library, no toast and no icon package", () => {
		const markup = renderToStaticMarkup(
			<ProductGallery
				images={[]}
				name=""
				onAdd={noop}
				onChange={noop}
				scope=""
			/>,
		);
		const installed = [
			...Object.keys(manifest.dependencies),
			...Object.keys(manifest.devDependencies),
		];

		expect(markup).toContain("Elegir una foto");

		for (const banned of [
			"@dnd-kit/core",
			"@dnd-kit/sortable",
			"@dnd-kit/utilities",
			"lucide-react",
			"sonner",
		]) {
			expect(installed).not.toContain(banned);
		}
	});

	it("keeps the runtime dependencies the branch shipped, cloudinary included", () => {
		expect(Object.keys(manifest.dependencies).sort()).toEqual([
			"@prisma/adapter-pg",
			"@prisma/client",
			"better-auth",
			"cloudinary",
			"next",
			"react",
			"react-dom",
			"zod",
		]);
	});
});
