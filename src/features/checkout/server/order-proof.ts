export const ORDER_PROOF_COOKIE = "itech-store.pedidos.v1";

export const ORDER_PROOF_SEPARATOR = "|";

export const ORDER_PROOF_LIMIT = 20;

export const ORDER_PROOF_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

const MAX_ID_LENGTH = 64;

export function parseOrderProofs(raw: string | null | undefined): string[] {
	if (typeof raw !== "string" || raw === "") {
		return [];
	}

	const proofs = new Set<string>();

	for (const entry of raw.split(ORDER_PROOF_SEPARATOR)) {
		const id = entry.trim();

		if (id === "" || id.length > MAX_ID_LENGTH) {
			continue;
		}

		proofs.add(id);

		if (proofs.size >= ORDER_PROOF_LIMIT) {
			break;
		}
	}

	return [...proofs];
}

export function rememberOrderProof(raw: string | null | undefined, id: string): string {
	const known = parseOrderProofs(raw).filter((entry) => entry !== id);
	const added = id.trim();

	const next =
		added === "" || added.length > MAX_ID_LENGTH
			? known
			: [added, ...known];

	return next.slice(0, ORDER_PROOF_LIMIT).join(ORDER_PROOF_SEPARATOR);
}

export function hasOrderProof(proofs: readonly string[], id: string): boolean {
	return proofs.includes(id);
}

export function orderProofCookieOptions() {
	return {
		httpOnly: true,
		sameSite: "lax" as const,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: ORDER_PROOF_MAX_AGE_SECONDS,
	};
}
