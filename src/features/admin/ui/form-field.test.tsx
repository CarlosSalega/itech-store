import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { blankDraft, validateProductDraft } from "../domain/product-form";
import { FormField } from "./form-field";

const NAME_HELP = "El nombre que se ve en el catálogo. No se traduce.";

function render(message: string | undefined) {
	return renderToStaticMarkup(
		<FormField help={NAME_HELP} htmlFor="nombre" label="Nombre" message={message}>
			{(field) => (
				<input
					aria-describedby={field.describedBy}
					aria-invalid={field.invalid}
					id="nombre"
				/>
			)}
		</FormField>,
	);
}

function slotText(markup: string, id: string): string {
	const match = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</span>`).exec(markup);

	return (match?.[1] ?? "").replace(/<[^>]*>/g, "").trim();
}

describe("the room a product field reserves for its message", () => {
	it("keeps one announced slot under a pristine field, with nothing written in it", () => {
		const markup = render(undefined);

		expect(markup.match(/aria-live="polite"/g)).toHaveLength(1);
		expect(markup).toContain('id="nombre-message"');
		expect(markup).toContain('aria-describedby="nombre-help nombre-message"');
		expect(markup).not.toContain("aria-invalid");
		expect(slotText(markup, "nombre-message")).toBe("");
	});

	it("keeps the standing note outside the message slot", () => {
		const markup = render(undefined);

		expect(markup).toContain(NAME_HELP);
		expect(slotText(markup, "nombre-help")).toBe(NAME_HELP);
		expect(slotText(markup, "nombre-message")).toBe("");
	});

	it("writes the shipped sentence in that slot once the field is rejected", () => {
		const markup = render(validateProductDraft(blankDraft(), []).name);

		expect(slotText(markup, "nombre-message")).toBe("Poné el nombre del producto.");
		expect(markup).toContain('aria-invalid="true"');
	});

	it("reserves a caption line instead of revealing the slot", () => {
		const css = readFileSync(new URL("./product-form.module.css", import.meta.url), "utf8");
		const source = readFileSync(new URL("./form-field.tsx", import.meta.url), "utf8");
		const line =
			/min-height:\s*calc\(var\(--t-caption\)\s*\*\s*1\.35\s*\+\s*var\(--s-1\)\)/;

		expect(css).toMatch(new RegExp(`\\.slot\\s*\\{[^}]*${line.source}`));
		expect(source).toContain("styles.slot");
	});
});
