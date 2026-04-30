import { PrismaClient } from '@prisma/client';
import { config } from './index.js';

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: config.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}

// Singleton: reuse client across hot-reloads in development
export const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (config.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
