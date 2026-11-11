import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

function connectionString(): string {
	const url = process.env.DATABASE_URL;

	if (!url) {
		throw new Error(
			"DATABASE_URL is not set. Add it to your .env file before using Prisma.",
		);
	}

	return url;
}

function createPrismaClient(): PrismaClient {
	// Prisma 7 requires a driver adapter; PrismaPg accepts the connection string.
	return new PrismaClient({ adapter: new PrismaPg(connectionString()) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Next.js reloads modules on every hot update in development. Reusing one
// client avoids opening a new connection pool per reload.
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}
