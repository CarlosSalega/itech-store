import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { prisma } from "./prisma";
import {
	createResendSender,
	resolveEmailEnv,
	type SendEmailInput,
	type SendEmailResult,
} from "./email/resend";

type AuthVariable = "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL";

type EmailVariable = "RESEND_API_KEY" | "RESEND_FROM_EMAIL";

function required(name: AuthVariable | EmailVariable): string {
	const value = process.env[name]?.trim();

	if (value === undefined || value === "") {
		throw new Error(
			`${name} is not set. Add it to your .env file before signing anyone in.`,
		);
	}

	return value;
}

let sendEmail:
	| ((input: SendEmailInput) => Promise<SendEmailResult>)
	| undefined;

export function setEmailSenderForTesting(
	impl: ((input: SendEmailInput) => Promise<SendEmailResult>) | undefined,
): void {
	sendEmail = impl;
}

function getEmailSender(): (input: SendEmailInput) => Promise<SendEmailResult> {
	sendEmail ??= createResendSender(resolveEmailEnv(process.env));

	return sendEmail;
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
		plugins: [
			nextCookies(),
			magicLink({
				expiresIn: 15 * 60,
				sendMagicLink: async ({ email, url }) => {
					const result = await getEmailSender()({
						to: email,
						subject: "Tu enlace para entrar a iTech Store",
						html: `<p>Hola:</p><p><a href="${url}">Entrá acá</a> para ver tus pedidos. El enlace vence en 15 minutos y se usa una sola vez.</p><p>Si no fuiste vos, ignorá este correo.</p>`,
					});

					if (!result.ok) {
						throw new Error(result.code);
					}
				},
			}),
		],
	});
}

type Auth = ReturnType<typeof buildAuth>;

let instance: Auth | undefined;

export function getAuth(): Auth {
	instance ??= buildAuth();

	return instance;
}
