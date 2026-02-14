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
      reply.status(status).send({ error: { ...body, requestId: request.id } });

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
    if (fastifyError.code === 'FST_REQ_FILE_TOO_LARGE') {
      const limitMb = Math.round(app.config.maxUploadBytes / 1024 / 1024);
      return send(413, { code: 'file_too_large', message: `Files can be at most ${limitMb} MB` });
    }
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
        requestId: request.id,
      },
    });
  });
}
