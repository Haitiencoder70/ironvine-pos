import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development'
      ? [{ level: 'query', emit: 'event' }, 'info', 'warn', 'error']
      : ['warn', 'error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

interface PrismaQueryEvent {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
}

if (process.env['NODE_ENV'] === 'development') {
  prisma.$on('query' as never, (event: unknown) => {
    const e = event as PrismaQueryEvent;
    if (e.duration > 500) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}
