import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CheckoutStepper, type CheckoutStep } from "./stepper";

const mark = (step: CheckoutStep, onNavigate?: () => void) =>
	renderToStaticMarkup(<CheckoutStepper current={step} onNavigate={onNavigate} />);

describe("the checkout stepper", () => {
	it.each([
		["datos", "33.3%"],
		["pago", "66.7%"],
		["confirmacion", "100%"],
	])("advances the progress bar on %s", (step, width) => {
		expect(mark(step as CheckoutStep)).toContain(`width:${width}`);
	});

	it("marks the step the visitor is on, and only that one", () => {
		const markup = mark("pago");

		expect(markup.match(/aria-current="step"/g)).toHaveLength(1);
		expect(markup).toContain("paso 2 de 3");
	});

	it("offers the completed steps as a way back only when asked", () => {
		expect(mark("pago", () => undefined)).toContain("<button");
		expect(mark("pago")).not.toContain("<button");
	});
});
