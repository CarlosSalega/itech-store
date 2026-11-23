import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
	BUYER_FIELDS,
	EMPTY_BUYER,
	validateBuyer,
	type BuyerField as BuyerFieldName,
} from "../domain/order";
import { BuyerField } from "./buyer-field";

const noop = () => undefined;

function render(field: BuyerFieldName, message?: string, value = "") {
	return renderToStaticMarkup(
		<BuyerField field={field} message={message} onChange={noop} value={value} />,
	);
}

function slotText(markup: string, id: string): string {
	const match = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</span>`).exec(markup);

	return (match?.[1] ?? "").replace(/<[^>]*>/g, "").trim();
}

describe("the room a buyer field reserves for its message", () => {
	it("keeps one announced slot under a pristine field, with nothing written in it", () => {
		for (const field of BUYER_FIELDS) {
			const markup = render(field);

			expect(markup.match(/aria-live="polite"/g)).toHaveLength(1);
			expect(markup).toContain(`id="buyer-${field}-message"`);
			expect(markup).toMatch(
				new RegExp(`aria-describedby="[^"]*buyer-${field}-message"`),
			);
			expect(markup).not.toContain("aria-invalid");
			expect(slotText(markup, `buyer-${field}-message`)).toBe("");
		}
	});

	it("writes the shipped sentence in that slot once the field is rejected", () => {
		const messages = validateBuyer(EMPTY_BUYER);

		for (const field of BUYER_FIELDS) {
			const message = messages[field];
			const markup = render(field, message);

			expect(message).toBeDefined();
			expect(slotText(markup, `buyer-${field}-message`)).toBe(message);
			expect(markup).toContain('aria-invalid="true"');
		}
	});

	it("reserves a caption line instead of revealing the slot", () => {
		const css = readFileSync(new URL("./wizard.module.css", import.meta.url), "utf8");
		const source = readFileSync(new URL("./buyer-field.tsx", import.meta.url), "utf8");
		const line =
			/min-height:\s*calc\(var\(--t-caption\)\s*\*\s*1\.35\s*\+\s*var\(--s-1\)\)/;

		expect(css).toMatch(new RegExp(`\\.slot\\s*\\{[^}]*${line.source}`));
		expect(source).toContain("styles.slot");
	});
});
