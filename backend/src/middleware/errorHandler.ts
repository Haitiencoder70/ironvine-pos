import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  _req: Request & { path: string; method: string },
  res: Response,
  _next: NextFunction,
): void {
  // ── Zod validation errors ──────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // ── Application-level errors ───────────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  // ── Prisma client errors ───────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const fields = (err.meta?.['target'] as string[] | undefined)?.join(', ') ?? 'field';
        res.status(409).json({
          error: `A record with this ${fields} already exists.`,
          code: 'CONFLICT',
        });
        return;
      }
      case 'P2025': {
        // Record not found
        res.status(404).json({
          error: 'The requested record was not found.',
          code: 'NOT_FOUND',
        });
        return;
      }
      case 'P2003': {
        // Foreign key constraint failure
        res.status(400).json({
          error: 'Referenced record does not exist.',
          code: 'FOREIGN_KEY_ERROR',
        });
        return;
      }
      case 'P2014': {
        // Relation violation
        res.status(400).json({
          error: 'This operation would violate a required relation.',
          code: 'RELATION_ERROR',
        });
        return;
      }
      default:
        logger.error('Unhandled Prisma error', { code: err.code, meta: err.meta });
        res.status(500).json({
          error: 'A database error occurred.',
          code: 'DATABASE_ERROR',
        });
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      error: 'Invalid data supplied to the database.',
      code: 'DATABASE_VALIDATION_ERROR',
    });
    return;
  }

  // ── Unknown / unhandled errors ─────────────────────────────────────────────
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error('Unhandled error', { message, stack, path: _req.path, method: _req.method });
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
