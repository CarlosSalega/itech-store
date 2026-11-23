export type SessionUser = {
	role?: string | null;
	name?: string | null;
	email?: string | null;
} | null;

export type AdminIdentity = {
	name: string;
	email: string;
};

export type AdminAccess =
	| { allowed: true; admin: AdminIdentity }
	| { allowed: false; loginHref: string };

const ADMIN_ROLE = "ADMIN";

export function adminInitials(name: string, email: string): string {
	const words = name.trim().split(/\s+/).filter((word) => word !== "");
	const first = words[0] ?? email.trim();
	const last = words.length > 1 ? words[words.length - 1] : "";

	if (first === "") return "?";

	return (first.slice(0, 1) + last.slice(0, 1)).toUpperCase();
}

export function adminAccess(user: SessionUser, path: string): AdminAccess {
	if (user?.role === ADMIN_ROLE) {
		return {
			allowed: true,
			admin: { name: user.name ?? "", email: user.email ?? "" },
		};
	}

	return {
		allowed: false,
		loginHref: `/login?next=${encodeURIComponent(path)}`,
	};
}
