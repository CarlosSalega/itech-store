import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "./prisma";

type AuthVariable = "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL";

function required(name: AuthVariable): string {
	const value = process.env[name]?.trim();

	if (value === undefined || value === "") {
		throw new Error(
			`${name} is not set. Add it to your .env file before signing anyone in.`,
		);
	}

	return value;
}

function buildAuth() {
	return betterAuth({
		secret: required("BETTER_AUTH_SECRET"),
		baseURL: required("BETTER_AUTH_URL"),
		database: prismaAdapter(prisma, { provider: "postgresql" }),
		disabledPaths: ["/sign-up/email"],
		emailAndPassword: {
			enabled: true,
		},
		user: {
			additionalFields: {
				role: {
					type: "string",
					required: false,
					defaultValue: "CUSTOMER",
					input: false,
				},
			},
		},
		plugins: [nextCookies()],
	});
}

type Auth = ReturnType<typeof buildAuth>;

let instance: Auth | undefined;

export function getAuth(): Auth {
	instance ??= buildAuth();

	return instance;
}
