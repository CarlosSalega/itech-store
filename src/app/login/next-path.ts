const FALLBACK_PATH = "/admin";
const ORIGIN = "http://same-origin.invalid";

export function safeNextPath(value: string | null | undefined): string {
	if (value === null || value === undefined || value === "") {
		return FALLBACK_PATH;
	}

	if (!value.startsWith("/")) {
		return FALLBACK_PATH;
	}

	let parsed: URL;

	try {
		parsed = new URL(value, ORIGIN);
	} catch {
		return FALLBACK_PATH;
	}

	if (parsed.origin !== ORIGIN) {
		return FALLBACK_PATH;
	}

	return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
