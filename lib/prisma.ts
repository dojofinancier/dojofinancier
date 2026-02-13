import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Single PrismaClient instance shared across the app.
 * Uses globalThis to prevent multiple connection pools in development (hot reload)
 * and serverless (reused containers). Each PrismaClient creates its own pool;
 * duplicate instances exhaust database connections.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

globalForPrisma.prisma = prisma;

