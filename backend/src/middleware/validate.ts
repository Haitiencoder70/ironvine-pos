import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const err = new ZodError(result.error.issues);
      return next(err);
    }

    // Replace with validated + coerced data
    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };
}
