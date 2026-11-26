import type { ImageErrorCode } from "../core/errors";
import type { UploadableFile } from "../core/types";
import type { UploadValidationPolicy } from "../core/validate";

export type GuardSessionUser = {
	readonly id?: string | null;
	readonly role?: string | null;
	readonly name?: string | null;
	readonly email?: string | null;
};

export type GuardSession =
	| {
			readonly user?: GuardSessionUser | null;
	  }
	| null
	| undefined;

export interface GuardActor {
	readonly id: string;
	readonly role: "ADMIN";
}

export interface ProductRef {
	readonly id: string;
	readonly name: string;
}

export interface ProductImageOwnership {
	readonly target: ProductRef;
	readonly listedBy: ProductRef | null;
}

export type ForbiddenReason = "OTHER_PRODUCT";

export type DeleteDecision =
	| { readonly allowed: true }
	| {
			readonly allowed: false;
			readonly reason: ForbiddenReason;
			readonly message: string;
	  };

export interface AuthorizeDeleteArgs {
	readonly actor: GuardActor;
	readonly key: string;
}

export type AuthorizeDelete = (
	args: AuthorizeDeleteArgs,
) => Promise<DeleteDecision> | DeleteDecision;

export interface GuardDenial {
	readonly ok: false;
	readonly code: ImageErrorCode;
	readonly reason?: ForbiddenReason;
	readonly message?: string;
	readonly details?: Record<string, unknown>;
}

export type AuthenticationDecision =
	| { readonly ok: true; readonly actor: GuardActor }
	| GuardDenial;

export type FileDecision = { readonly ok: true; readonly file: UploadableFile } | GuardDenial;

export type DeleteAuthorizationDecision = { readonly ok: true } | GuardDenial;

export interface UploadGuardArgs {
	readonly session: GuardSession;
	readonly file: unknown;
	readonly policy?: UploadValidationPolicy;
}

export type UploadGuardDecision =
	| { readonly ok: true; readonly actor: GuardActor; readonly file: UploadableFile }
	| GuardDenial;

export interface DeleteGuardArgs {
	readonly session: GuardSession;
	readonly key: string;
	readonly authorizeDelete?: AuthorizeDelete;
}

export type DeleteGuardDecision =
	| { readonly ok: true; readonly actor: GuardActor }
	| GuardDenial;
