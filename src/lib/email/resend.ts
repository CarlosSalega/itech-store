export type EmailEnv = {
	apiKey: string;
	from: string;
};

export function resolveEmailEnv(
	env: Record<string, string | undefined>,
	fromEnv: Record<string, string | undefined> = env,
): EmailEnv {
	const apiKey = env.RESEND_API_KEY?.trim();
	const from = fromEnv.RESEND_FROM_EMAIL?.trim();

	if (!apiKey) {
		throw new Error("RESEND_API_KEY is not set. Add it to your .env file before sending email.");
	}

	if (!from) {
		throw new Error(
			"RESEND_FROM_EMAIL is not set. Add it to your .env file before sending email.",
		);
	}

	return { apiKey, from };
}

export type EmailCode = "EMAIL_RATE_LIMITED" | "EMAIL_INVALID_RECIPIENT" | "EMAIL_NOT_SENT";

export type SendEmailInput = {
	to: string;
	subject: string;
	html: string;
};

export type SendEmailResult = { ok: true; id: string } | { ok: false; code: EmailCode };

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

function failureFrom(status: number, body: string): SendEmailResult {
	let name = "";
	let message = "";

	try {
		const parsed: unknown = JSON.parse(body);

		if (typeof parsed === "object" && parsed !== null) {
			name = typeof (parsed as { name?: unknown }).name === "string"
				? (parsed as { name: string }).name
				: "";
			message = typeof (parsed as { message?: unknown }).message === "string"
				? (parsed as { message: string }).message
				: "";
		}
	} catch {
		return { ok: false, code: "EMAIL_NOT_SENT" };
	}

	if (status === 429 || name === "rate_limit_error") {
		return { ok: false, code: "EMAIL_RATE_LIMITED" };
	}

	if (status === 422 || name === "validation_error") {
		return { ok: false, code: "EMAIL_INVALID_RECIPIENT" };
	}

	void message;

	return { ok: false, code: "EMAIL_NOT_SENT" };
}

export function createResendSender(
	env: EmailEnv,
	fetchImpl: FetchLike = fetch,
): (input: SendEmailInput) => Promise<SendEmailResult> {
	return async ({ to, subject, html }) => {
		let response: Response;

		try {
			response = await fetchImpl("https://api.resend.com/emails", {
				method: "POST",
				headers: {
					authorization: `Bearer ${env.apiKey}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({ from: env.from, to: [to], subject, html }),
			});
		} catch {
			return { ok: false, code: "EMAIL_NOT_SENT" };
		}

		if (response.ok) {
			try {
				const parsed = (await response.json()) as { id?: unknown };

				return typeof parsed.id === "string"
					? { ok: true, id: parsed.id }
					: { ok: false, code: "EMAIL_NOT_SENT" };
			} catch {
				return { ok: false, code: "EMAIL_NOT_SENT" };
			}
		}

		return failureFrom(response.status, await response.text());
	};
}

export function emailErrorMessage(code: EmailCode): string {
	switch (code) {
		case "EMAIL_RATE_LIMITED":
			return "Demasiados correos en poco tiempo. Esperá un momento y volvé a intentar.";
		case "EMAIL_INVALID_RECIPIENT":
			return "Ese correo no parece válido. Revisalo y volvé a intentar.";
		case "EMAIL_NOT_SENT":
			return "No pudimos enviar el correo en este momento. Volvé a intentar en un rato.";
	}
}
