import { forbiddenMessage } from "./copy";
import type { DeleteDecision, ProductImageOwnership } from "./types";

export function authorizeProductImageDelete(facts: ProductImageOwnership): DeleteDecision {
	if (facts.listedBy === null || facts.listedBy.id === facts.target.id) {
		return { allowed: true };
	}

	return {
		allowed: false,
		reason: "OTHER_PRODUCT",
		message: forbiddenMessage("OTHER_PRODUCT", facts.listedBy),
	};
}
