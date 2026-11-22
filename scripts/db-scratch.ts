import "dotenv/config";

import { execFileSync } from "node:child_process";

import { describeScratchTarget, resolveScratchUrl } from "../src/lib/db/scratch";

const COMMANDS = ["deploy", "status", "reset", "dev", "seed"] as const;
type Command = (typeof COMMANDS)[number];

function isCommand(value: string | undefined): value is Command {
	return value !== undefined && (COMMANDS as readonly string[]).includes(value);
}

const command = process.argv[2];

if (!isCommand(command)) {
	console.error(
		`Usage: tsx scripts/db-scratch.ts <${COMMANDS.join("|")}>\n` +
			"Runs a Prisma migration command against SCRATCH_DATABASE_URL, never against DATABASE_URL.",
	);
	process.exit(2);
}

const target = resolveScratchUrl(process.env);

if (!target.ok) {
	console.error(`Refusing to run: ${target.detail}`);
	process.exit(1);
}

const extra = process.argv.slice(3);

if (command !== "dev" && extra.length > 0) {
	console.error(
		`Refusing to run: ${command} takes no extra arguments, and this script does not drop them silently. Got: ${extra.join(" ")}`,
	);
	process.exit(2);
}

console.log(`Target: ${describeScratchTarget(target)}`);

const args =
	command === "status"
		? ["prisma", "migrate", "status"]
		: command === "reset"
			? ["prisma", "migrate", "reset", "--force", "--skip-seed"]
			: command === "dev"
				? ["prisma", "migrate", "dev", ...extra]
				: command === "seed"
					? ["prisma", "db", "seed"]
					: ["prisma", "migrate", "deploy"];

try {
	execFileSync("pnpm", args, {
		stdio: "inherit",
		env: { ...process.env, DATABASE_URL: target.url },
	});
} catch {
	console.error(`prisma ${command} failed against the scratch database.`);
	process.exit(1);
}
