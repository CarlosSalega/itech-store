import { isImageError } from "../core/errors";
import { evaluateAuthentication } from "../guards/policy";
import type { GuardSession } from "../guards/types";
import type { SignedUpload, SignUploadRequest, UploadScope } from "../provider/cloudinary";
import { type JsonObject, imageResponse, readJsonObject, readText } from "./http";

export interface SignRequestLike {
	json(): Promise<unknown>;
}

export interface SignProvider {
	signUpload(request: SignUploadRequest): SignedUpload;
}

export interface SignHandlerConfig {
	/** Built on the first accepted request, so a missing credential never answers a stranger. */
	readonly getProvider: () => SignProvider;
	readonly getSession: () => Promise<GuardSession> | GuardSession;
}

export interface SignHandler {
	POST(request: SignRequestLike): Promise<Response>;
}

/**
 * `POST` answers what the browser needs to post the file straight to the
 * provider: the signature, its timestamp, the api key, the cloud name, the
 * folder, the public id, the key the asset will own and the upload url.
 *
 * The timestamp is the provider's, never the caller's: a client-chosen one
 * would be a signature that does not expire.
 */
export function createSignHandler(config: SignHandlerConfig): SignHandler {
	async function POST(request: SignRequestLike): Promise<Response> {
		const authentication = evaluateAuthentication(await config.getSession());

		if (!authentication.ok) return imageResponse(authentication.code);

		const body = await readJsonObject(request);
		const scope = readScope(body);

		if (scope === null) return imageResponse("MISSING_KEY");

		const publicId = readText(body, "publicId");

		try {
			const signed = config.getProvider().signUpload({
				scope,
				...(publicId === null ? {} : { publicId }),
			});

			return Response.json(signed, { status: 200 });
		} catch (error) {
			return isImageError(error) ? imageResponse(error.code) : imageResponse("MISCONFIGURED");
		}
	}

	return { POST };
}

/**
 * The scope names the owner of the folder. The provider itself refuses a scope
 * whose id is not a safe path segment, so a body that names one is passed on
 * and a body that names neither is the only thing decided here.
 */
function readScope(body: JsonObject): UploadScope | null {
	const productId = readText(body, "productId");

	if (productId !== null) return { productId };

	const storeId = readText(body, "storeId");

	if (storeId !== null) return { storeId };

	return null;
}
