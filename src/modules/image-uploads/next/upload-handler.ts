import { isImageError } from "../core/errors";
import type { ImageProvider } from "../core/types";
import { evaluateAuthentication, evaluateDelete } from "../guards/policy";
import type {
	AuthorizeDeleteArgs,
	DeleteDecision,
	GuardActor,
	GuardSession,
} from "../guards/types";
import { imageResponse, readJsonObject, readText } from "./http";

export interface WebRequestLike {
	json(): Promise<unknown>;
}

export interface RecordedImage {
	readonly id: string;
	readonly position: number;
	readonly alt: string;
	readonly url: string;
}

export interface RecordUploadArgs {
	readonly actor: GuardActor;
	readonly key: string;
	readonly url: string;
	readonly productId: string | null;
	readonly alt: string | null;
}

export interface RecordUploadResult {
	readonly image: RecordedImage | null;
}

export type RecordUpload = (args: RecordUploadArgs) => Promise<RecordUploadResult>;

export interface DeleteUploadArgs {
	readonly actor: GuardActor;
	readonly key: string;
	readonly productId: string | null;
}

export type AuthorizeUploadDelete = (
	args: DeleteUploadArgs,
) => Promise<DeleteDecision> | DeleteDecision;

export interface UploadHandlerConfig {
	readonly getSession: () => Promise<GuardSession> | GuardSession;
	/** Built on the first accepted delete, so a missing credential never answers a stranger. */
	readonly getProvider: () => Pick<ImageProvider, "delete">;
	readonly record: RecordUpload;
	/** Absence fails closed: the guard then refuses every key. */
	readonly authorizeDelete?: AuthorizeUploadDelete;
	/** Runs once the provider confirms the asset is gone. */
	readonly forget?: (args: {
		readonly actor: GuardActor;
		readonly key: string;
	}) => Promise<void> | void;
}

export interface UploadHandler {
	POST(request: WebRequestLike): Promise<Response>;
	DELETE(request: WebRequestLike): Promise<Response>;
}

/**
 * The two write paths of the module in HTTP: `POST` records an upload that
 * already reached the provider, `DELETE` removes one by key.
 *
 * The order is the module's and it is not negotiable: authenticate → read the
 * body → authorize → provider. The provider is built on the last step, and an
 * anonymous request never reaches it.
 */
export function createUploadHandler(config: UploadHandlerConfig): UploadHandler {
	async function POST(request: WebRequestLike): Promise<Response> {
		const authentication = evaluateAuthentication(await config.getSession());

		if (!authentication.ok) return imageResponse(authentication.code);

		const body = await readJsonObject(request);
		const key = readText(body, "key");
		const url = readText(body, "url");

		if (key === null || url === null) return imageResponse("MISSING_KEY");

		const productId = readText(body, "productId");
		const alt = readText(body, "alt");

		try {
			const recorded = await config.record({
				actor: authentication.actor,
				key,
				url,
				productId,
				alt,
			});

			return Response.json(
				{ success: true, key, image: recorded.image },
				{ status: 201 },
			);
		} catch (error) {
			return isImageError(error) ? imageResponse(error.code) : imageResponse("UPLOAD_FAILED");
		}
	}

	async function DELETE(request: WebRequestLike): Promise<Response> {
		const authentication = evaluateAuthentication(await config.getSession());

		if (!authentication.ok) return imageResponse(authentication.code);

		const body = await readJsonObject(request);
		const key = readText(body, "key");

		if (key === null) return imageResponse("MISSING_KEY");

		const productId = readText(body, "productId");
		const authorize = config.authorizeDelete;

		const authorization = await evaluateDelete({
			actor: authentication.actor,
			key,
			...(authorize === undefined
				? {}
				: {
						authorizeDelete: (args: AuthorizeDeleteArgs) =>
							authorize({ actor: args.actor, key: args.key, productId }),
					}),
		});

		if (!authorization.ok) {
			return imageResponse(authorization.code, authorization.message);
		}

		try {
			const deleted = await config.getProvider().delete(key);

			if (!deleted.success) return imageResponse("DELETE_FAILED");

			await forget(config, authentication.actor, key);

			return Response.json({ success: true, key }, { status: 200 });
		} catch (error) {
			return isImageError(error) ? imageResponse(error.code) : imageResponse("DELETE_FAILED");
		}
	}

	return { POST, DELETE };
}

/**
 * The asset is already gone when this runs, so a failed write must not answer
 * as a failed delete: the client would retry a key the provider no longer has.
 * A stale record is the cheaper failure, and the caller answers success.
 */
async function forget(
	config: UploadHandlerConfig,
	actor: GuardActor,
	key: string,
): Promise<void> {
	if (config.forget === undefined) return;

	try {
		await config.forget({ actor, key });
	} catch {
		// Reported as a stale record, never as a failed delete.
	}
}
