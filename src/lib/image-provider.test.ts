import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CLOUDINARY_ENV_KEYS, createCloudinaryProvider } from "@/modules/image-uploads";

const ENV_KEYS = [
	"NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
	"CLOUDINARY_API_KEY",
	"CLOUDINARY_API_SECRET",
] as const;

let savedEnv: Record<string, string | undefined> = {};

function clearCredentials(): void {
	for (const key of ENV_KEYS) delete process.env[key];
}

function setCredentials(): void {
	process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
	process.env.CLOUDINARY_API_KEY = "test-key";
	process.env.CLOUDINARY_API_SECRET = "test-secret";
}

function firstUseThrows(run: () => unknown): unknown {
	try {
		run();
	} catch (error) {
		return error;
	}

	return undefined;
}

describe("getImageProvider", () => {
	beforeEach(() => {
		savedEnv = {};
		for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
		vi.resetModules();
	});

	afterEach(() => {
		for (const key of ENV_KEYS) {
			const value = savedEnv[key];

			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}

		vi.resetModules();
	});

	it("imports without reading the credentials", async () => {
		clearCredentials();

		await expect(import("./image-provider")).resolves.toBeDefined();
	});

	it("fails on the first use with an error that names the missing variable", async () => {
		clearCredentials();
		process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
		process.env.CLOUDINARY_API_KEY = "test-key";

		const { getImageProvider } = await import("./image-provider");
		const thrown = firstUseThrows(getImageProvider);

		expect(thrown).toMatchObject({
			name: "CloudinaryConfigError",
			missing: ["CLOUDINARY_API_SECRET"],
		});
		expect((thrown as Error).message).toContain("CLOUDINARY_API_SECRET");
	});

	it("builds the provider once and reuses it for the process", async () => {
		setCredentials();

		const { getImageProvider } = await import("./image-provider");
		const first = getImageProvider();

		expect(getImageProvider()).toBe(first);
		expect(typeof first.signUpload).toBe("function");
	});

	it("builds on the next use after a failed first one", async () => {
		clearCredentials();

		const { getImageProvider } = await import("./image-provider");

		expect(firstUseThrows(getImageProvider)).toMatchObject({ name: "CloudinaryConfigError" });

		setCredentials();

		expect(typeof getImageProvider().signUpload).toBe("function");
	});

	it("reads the three explicit values and nothing else", () => {
		expect(Object.values(CLOUDINARY_ENV_KEYS).sort()).toEqual([...ENV_KEYS].sort());
	});

	it("reaches the provider factory through the module's public surface", () => {
		expect(typeof createCloudinaryProvider).toBe("function");
	});
});
