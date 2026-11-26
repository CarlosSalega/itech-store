import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import type { GuardSession } from "@/modules/image-uploads";

/**
 * The panel's actor, read on the server exactly as the admin layout reads it.
 * Better Auth answers `null` for an expired session, so a dead cookie is
 * anonymous here too and the guard refuses it before anything else runs.
 */
export async function readUploadSession(): Promise<GuardSession> {
	const session = await getAuth().api.getSession({ headers: await headers() });
	const user = session?.user;

	if (user === undefined || user === null) return null;

	return {
		user: {
			id: user.id,
			role: typeof user.role === "string" ? user.role : null,
		},
	};
}
