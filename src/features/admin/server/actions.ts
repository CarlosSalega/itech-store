"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import type { AdminProductPatch } from "../domain/product";
import type { SessionUser } from "../domain/session";
import {
	createAdminProductActions,
	type AdminActionResult,
	type AdminProductInput,
} from "./product-actions";

async function readSession(): Promise<SessionUser> {
	const session = await getAuth().api.getSession({ headers: await headers() });
	const user = session?.user;

	if (user === undefined || user === null) {
		return null;
	}

	return {
		role: typeof user.role === "string" ? user.role : null,
		name: typeof user.name === "string" ? user.name : null,
		email: typeof user.email === "string" ? user.email : null,
	};
}

function revalidate(paths: readonly string[]): void {
	for (const path of paths) {
		revalidatePath(path);
	}
}

const actions = createAdminProductActions({
	readSession,
	client: {
		product: prisma.product,
		productImage: prisma.productImage,
		variant: prisma.variant,
	},
	revalidate,
});

export async function createProductAction(
	input: AdminProductInput,
): Promise<AdminActionResult> {
	return actions.create(input);
}

export async function updateProductAction(
	slug: string,
	patch: AdminProductPatch,
): Promise<AdminActionResult> {
	return actions.update(slug, patch);
}

export async function publishProductAction(slug: string): Promise<AdminActionResult> {
	return actions.publish(slug);
}

export async function unpublishProductAction(slug: string): Promise<AdminActionResult> {
	return actions.unpublish(slug);
}

export async function deleteProductAction(slug: string): Promise<AdminActionResult> {
	return actions.remove(slug);
}
