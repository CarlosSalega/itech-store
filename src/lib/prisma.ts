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
	return new PrismaClient({ adapter: new PrismaPg(connectionString()) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
	globalForPrisma.prisma = prisma;
}
