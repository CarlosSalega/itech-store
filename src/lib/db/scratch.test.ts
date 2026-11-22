import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { describeScratchTarget, resolveScratchUrl } from "./scratch";

const APP = "postgresql://user:pass@db.prisma.io:5432/itech";
const SCRATCH = "postgresql://user:pass@scratch.prisma.io:5432/itech_scratch";

describe("resolveScratchUrl", () => {
	it("accepts a postgres URL that is not the app's", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: APP,
			SCRATCH_DATABASE_URL: SCRATCH,
		});

		expect(result.ok).toBe(true);
		expect(result.ok && result.database).toBe("itech_scratch");
		expect(result.ok && result.host).toBe("scratch.prisma.io");
	});

	it("refuses when the scratch URL is missing", () => {
		const result = resolveScratchUrl({ DATABASE_URL: APP });

		expect(result.ok).toBe(false);
		expect(result.ok === false && result.problem).toBe("missing");
	});

	it("refuses a blank scratch URL", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: APP,
			SCRATCH_DATABASE_URL: "   ",
		});

		expect(result.ok === false && result.problem).toBe("missing");
	});

	it("refuses anything that is not postgres", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: APP,
			SCRATCH_DATABASE_URL: "mysql://user:pass@host:3306/itech",
		});

		expect(result.ok === false && result.problem).toBe("not-postgres");
	});

	it("refuses a value that is not a URL at all", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: APP,
			SCRATCH_DATABASE_URL: "scratch",
		});

		expect(result.ok === false && result.problem).toBe("not-postgres");
	});

	it("refuses the app's database even when written differently", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: APP,
			SCRATCH_DATABASE_URL: APP,
		});

		expect(result.ok === false && result.problem).toBe("same-as-app");
	});

	it("refuses the same host and database with different credentials", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: APP,
			SCRATCH_DATABASE_URL: "postgresql://other:secret@db.prisma.io:5432/itech",
		});

		expect(result.ok === false && result.problem).toBe("same-host-and-database");
	});

	it("allows the same host with a different database", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: APP,
			SCRATCH_DATABASE_URL: "postgresql://user:pass@db.prisma.io:5432/itech_scratch",
		});

		expect(result.ok).toBe(true);
	});

	it("describes the target without leaking credentials", () => {
		const described = describeScratchTarget(
			resolveScratchUrl({ DATABASE_URL: APP, SCRATCH_DATABASE_URL: SCRATCH }),
		);

		expect(described).toContain("itech_scratch");
		expect(described).not.toContain("pass");
	});
});

describe("resolveScratchUrl, spellings of the app database", () => {
	it("refuses the same database written with and without the default port", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: "postgresql://user:pass@db.prisma.io/itech",
			SCRATCH_DATABASE_URL: "postgresql://user:pass@db.prisma.io:5432/itech",
		});

		expect(result.ok === false && result.problem).toBe("same-host-and-database");
	});

	it("refuses the same database written with a different host case", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: "postgresql://user:pass@DB.Prisma.io:5432/itech",
			SCRATCH_DATABASE_URL: "postgresql://user:pass@db.prisma.io/itech",
		});

		expect(result.ok === false && result.problem).toBe("same-host-and-database");
	});

	it("refuses when the app URL cannot be parsed, instead of skipping the check", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: "not-a-url",
			SCRATCH_DATABASE_URL: SCRATCH,
		});

		expect(result.ok === false && result.problem).toBe("app-url-unreadable");
	});

	it("still allows the same host with a different database", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: "postgresql://user:pass@db.prisma.io/itech",
			SCRATCH_DATABASE_URL: "postgresql://user:pass@db.prisma.io:5432/itech_scratch",
		});

		expect(result.ok).toBe(true);
	});
});

describe("the db:scratch script", () => {
	it("passes a command, so the entry point cannot exit with usage", () => {
		const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts as Record<
			string,
			string
		>;

		for (const name of ["db:scratch", "db:scratch:dev", "db:scratch:seed"]) {
			expect(scripts[name]).toMatch(/db-scratch\.ts (deploy|dev|seed)$/);
		}
	});
});

describe("resolveScratchUrl, a missing app URL", () => {
	it("refuses when DATABASE_URL is not set, instead of skipping the comparison", () => {
		const result = resolveScratchUrl({ SCRATCH_DATABASE_URL: SCRATCH });

		expect(result.ok === false && result.problem).toBe("app-missing");
	});

	it("refuses when DATABASE_URL is blank", () => {
		const result = resolveScratchUrl({
			DATABASE_URL: "  ",
			SCRATCH_DATABASE_URL: SCRATCH,
		});

		expect(result.ok === false && result.problem).toBe("app-missing");
	});
});
