"use server";

import { redirect } from "next/navigation";

export async function enterAdminDemo(): Promise<void> {
	redirect("/admin");
}
