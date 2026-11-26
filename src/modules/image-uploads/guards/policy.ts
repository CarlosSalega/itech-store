import { describeError } from "../core/errors";
import { IMAGE_UPLOAD_LIMITS } from "../core/limits";
import type { UploadValidationPolicy } from "../core/validate";
import { validateUploadFile } from "../core/validate";
import type {
	AuthenticationDecision,
	AuthorizeDelete,
	DeleteAuthorizationDecision,
	DeleteGuardArgs,
	DeleteGuardDecision,
	FileDecision,
	GuardActor,
	GuardSession,
	UploadGuardArgs,
	UploadGuardDecision,
} from "./types";

const ADMIN_ROLE = "ADMIN";

export function evaluateAuthentication(session: GuardSession): AuthenticationDecision {
	const user = session?.user;

	if (!user || typeof user.id !== "string" || user.id.length === 0) {
		return { ok: false, code: "UNAUTHENTICATED" };
	}

	if (user.role !== ADMIN_ROLE) {
		return { ok: false, code: "FORBIDDEN" };
	}

	return { ok: true, actor: { id: user.id, role: "ADMIN" } };
}

export function evaluateUploadFile(
	input: unknown,
	policy: UploadValidationPolicy = IMAGE_UPLOAD_LIMITS,
): FileDecision {
	const validation = validateUploadFile(input, policy);

	if (validation.ok) {
		return { ok: true, file: validation.file };
	}

	return { ok: false, code: validation.code, details: validation.details };
}

export interface EvaluateDeleteArgs {
	readonly actor: GuardActor;
	readonly key: string;
	readonly authorizeDelete?: AuthorizeDelete;
}

export async function evaluateDelete({
	actor,
	key,
	authorizeDelete,
}: EvaluateDeleteArgs): Promise<DeleteAuthorizationDecision> {
	if (!authorizeDelete) {
		return {
			ok: false,
			code: "FORBIDDEN",
			details: { cause: "authorizeDelete is not configured" },
		};
	}

	let decision: Awaited<ReturnType<AuthorizeDelete>>;

	try {
		decision = await authorizeDelete({ actor, key });
	} catch (error) {
		return {
			ok: false,
			code: "FORBIDDEN",
			details: { error: describeError(error) },
		};
	}

	if (decision.allowed) {
		return { ok: true };
	}

	return {
		ok: false,
		code: "FORBIDDEN",
		...(decision.reason === undefined ? {} : { reason: decision.reason }),
		...(decision.message === undefined ? {} : { message: decision.message }),
	};
}

export function guardUpload({
	session,
	file,
	policy,
}: UploadGuardArgs): UploadGuardDecision {
	const authentication = evaluateAuthentication(session);

	if (!authentication.ok) return authentication;

	const fileDecision = evaluateUploadFile(file, policy);

	if (!fileDecision.ok) return fileDecision;

	return { ok: true, actor: authentication.actor, file: fileDecision.file };
}

export async function guardDelete({
	session,
	key,
	authorizeDelete,
}: DeleteGuardArgs): Promise<DeleteGuardDecision> {
	const authentication = evaluateAuthentication(session);

	if (!authentication.ok) return authentication;

	const authorization = await evaluateDelete({
		actor: authentication.actor,
		key,
		...(authorizeDelete === undefined ? {} : { authorizeDelete }),
	});

	if (!authorization.ok) return authorization;

	return { ok: true, actor: authentication.actor };
}
