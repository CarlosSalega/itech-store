export type ScratchUrlProblem =
	| "missing"
	| "not-postgres"
	| "same-as-app"
	| "same-host-and-database";

export type ScratchUrlResult =
	| { ok: true; url: string; host: string; database: string }
	| { ok: false; problem: ScratchUrlProblem; detail: string };

const ENV_APP = "DATABASE_URL";
const ENV_SCRATCH = "SCRATCH_DATABASE_URL";

function parse(url: string): URL | null {
	try {
		return new URL(url);
	} catch {
		return null;
	}
}

export function resolveScratchUrl(
	env: Record<string, string | undefined>,
): ScratchUrlResult {
	const scratch = env[ENV_SCRATCH];

	if (scratch === undefined || scratch.trim() === "") {
		return {
			ok: false,
			problem: "missing",
			detail: `${ENV_SCRATCH} is not set. A migration is rehearsed against a scratch database, never against the app's.`,
		};
	}

	const parsed = parse(scratch);

	if (parsed === null || !/^postgres(ql)?:$/.test(parsed.protocol)) {
		return {
			ok: false,
			problem: "not-postgres",
			detail: `${ENV_SCRATCH} is not a postgres:// or postgresql:// URL.`,
		};
	}

	const app = env[ENV_APP];

	if (app !== undefined && app.trim() !== "" && app === scratch) {
		return {
			ok: false,
			problem: "same-as-app",
			detail: `${ENV_SCRATCH} is identical to ${ENV_APP}. Refusing to touch the app's database.`,
		};
	}

	const appParsed = app === undefined ? null : parse(app);

	if (
		appParsed !== null &&
		appParsed.host === parsed.host &&
		appParsed.pathname === parsed.pathname
	) {
		return {
			ok: false,
			problem: "same-host-and-database",
			detail: `${ENV_SCRATCH} points at the same host and database as ${ENV_APP}. Refusing to touch the app's database.`,
		};
	}

	return {
		ok: true,
		url: scratch,
		host: parsed.host,
		database: parsed.pathname.replace(/^\//, ""),
	};
}

export function describeScratchTarget(result: ScratchUrlResult): string {
	return result.ok
		? `scratch database ${result.database} on ${result.host}`
		: result.detail;
}
