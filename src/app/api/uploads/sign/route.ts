import { readUploadSession } from "@/features/admin/server/upload-session";
import { getImageProvider } from "@/lib/image-provider";
import { createSignHandler } from "@/modules/image-uploads/next";

/**
 * `/api/uploads/sign` — POST answers the signature the browser posts the file
 * with, plus the key the asset will own. The api secret stays on this side:
 * only the signature and the api key travel.
 */
const { POST } = createSignHandler({
	getSession: readUploadSession,
	getProvider: () => getImageProvider(),
});

export { POST };
