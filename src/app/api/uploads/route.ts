import {
	authorizeImageUploadDelete,
	recordImageUpload,
} from "@/features/admin/server/image-uploads";
import { createPrismaImageUploadStore } from "@/features/admin/server/prisma-image-upload-store";
import { readUploadSession } from "@/features/admin/server/upload-session";
import { getImageProvider } from "@/lib/image-provider";
import { prisma } from "@/lib/prisma";
import { createUploadHandler } from "@/modules/image-uploads/next";

const store = createPrismaImageUploadStore(prisma);

/**
 * `/api/uploads` — POST records an upload that already reached Cloudinary,
 * DELETE removes one asset by key.
 *
 * The module owns the order — authenticate (401) → body (400) → ownership
 * (403) → provider (500) — and the Spanish copy. This file owns only the three
 * app-side inputs: who the actor is, which rows the record writes, and whether
 * the key may be deleted.
 */
const { POST, DELETE } = createUploadHandler({
	getSession: readUploadSession,

	// Built per accepted request: a missing credential must not answer a stranger.
	getProvider: () => getImageProvider(),

	record: (args) => recordImageUpload(args, store),

	authorizeDelete: (args) => authorizeImageUploadDelete(args, store),

	forget: ({ key }) => store.forgetUpload(key),
});

export { POST, DELETE };
