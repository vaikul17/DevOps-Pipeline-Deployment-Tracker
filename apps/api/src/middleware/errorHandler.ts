import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ err }, 'Unhandled error');

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      statusCode: 400,
    });
  }

  if (err.name === 'NotFoundError' || (err as any).code === 'P2025') {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message || 'Resource not found',
      statusCode: 404,
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    statusCode: 500,
  });
}
