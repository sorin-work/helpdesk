import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { attachments } from '../../db/schema/index.js';
import { AppError, badRequest } from '../../lib/errors.js';
import { parse } from '../../lib/validation.js';
import { currentUser } from '../../plugins/auth.js';
import { toAttachmentDto } from '../tickets/dto.js';
import { getAttachmentFor, sanitizeFilename } from './service.js';
import { LocalStorage } from './storage.js';

export async function attachmentRoutes(app: FastifyInstance) {
  const storage = new LocalStorage(app.config.uploadDir);

  await app.register(multipart, {
    limits: { fileSize: app.config.maxUploadBytes, files: 1, fields: 0 },
  });

  app.post('/attachments', { preHandler: app.authenticate }, async (request, reply) => {
    const user = currentUser(request);
    const file = await request.file();
    if (!file) throw badRequest('Attach a file in the "file" field');

    const contentType = file.mimetype.toLowerCase();
    if (!app.config.allowedUploadTypes.includes(contentType)) {
      file.file.resume();
      throw new AppError(
        415,
        'unsupported_file_type',
        `Files of type ${contentType} are not allowed`,
      );
    }

    const stored = await storage.save(file.file, app.now());
    if (file.file.truncated) {
      // Only reached when the multipart limit does not throw by itself.
      await storage.remove(stored.key);
      throw new AppError(413, 'file_too_large', 'File is too large');
    }
    if (stored.size === 0) {
      await storage.remove(stored.key);
      throw badRequest('File is empty');
    }

    const [attachment] = await app.db
      .insert(attachments)
      .values({
        uploaderId: user.id,
        filename: sanitizeFilename(file.filename),
        contentType,
        size: stored.size,
        storageKey: stored.key,
      })
      .returning();
    return reply.status(201).send(toAttachmentDto(attachment!));
  });

  app.get<{ Params: { id: string } }>(
    '/attachments/:id',
    { preHandler: app.authenticate },
    async (request, reply) => {
      const id = parse(z.uuid(), request.params.id);
      const attachment = await getAttachmentFor(app.db, currentUser(request), id);
      const encoded = encodeURIComponent(attachment.filename);
      return reply
        .header('content-type', attachment.contentType)
        .header('content-length', attachment.size)
        .header('content-disposition', `attachment; filename*=UTF-8''${encoded}`)
        .send(storage.open(attachment.storageKey));
    },
  );
}
