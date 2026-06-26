import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  // App errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Resource already exists (unique constraint)' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found' });
    }
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
};
