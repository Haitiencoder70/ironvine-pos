import { Request, Response, NextFunction } from 'express';

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    // req.query is a getter — mutate in place rather than replacing
    for (const key of Object.keys(req.query)) {
      const value = req.query[key];
      if (typeof value === 'string') {
        req.query[key] = value.replace(/<[^>]*>/g, '').trim().replace(/\0/g, '');
      }
    }
  }
  next();
}

function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key as keyof T] = value
        .replace(/<[^>]*>/g, '')
        .trim()
        .replace(/\0/g, '') as T[keyof T];
    } else if (Array.isArray(value)) {
      result[key as keyof T] = value.map(item =>
        typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : typeof item === 'string'
          ? item.replace(/<[^>]*>/g, '').trim().replace(/\0/g, '')
          : item,
      ) as T[keyof T];
    } else if (typeof value === 'object' && value !== null) {
      result[key as keyof T] = sanitizeObject(value as Record<string, unknown>) as T[keyof T];
    } else {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}
