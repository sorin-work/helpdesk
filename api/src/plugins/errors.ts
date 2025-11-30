import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown; requestId?: string };
}

/** Turns thrown errors into a consistent JSON shape. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    const send = (status: number, body: ErrorBody['error']) =>
      reply.status(status).send({ error: body });

    if (error instanceof ZodError) {
      return send(400, {
        code: 'validation_error',
        message: 'Some fields are missing or invalid',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    if (error instanceof AppError) {
      return send(error.statusCode, {
        code: error.code,
        message: error.message,
        details: error.details,
      });
    }

    const fastifyError = error as FastifyError;
    if (fastifyError.statusCode && fastifyError.statusCode < 500) {
      return send(fastifyError.statusCode, {
        code: fastifyError.code?.toLowerCase() ?? 'bad_request',
        message: fastifyError.message,
      });
    }

    request.log.error({ err: error }, 'unhandled error');
    return send(500, { code: 'internal_error', message: 'Something went wrong on our side' });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'not_found',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });
}
