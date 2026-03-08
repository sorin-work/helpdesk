import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { badRequest, unauthorized } from '../../lib/errors.js';
import { parse } from '../../lib/validation.js';
import { currentUser, endSession, isStaff, startSession } from '../../plugins/auth.js';
import { toUserDto } from '../users/dto.js';
import {
  changePassword,
  createUser,
  findUserByEmail,
  updateUser,
  verifyPassword,
} from '../users/service.js';

const signupBody = z.object({
  email: z.email().max(254),
  name: z.string().trim().min(1, 'Name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

const loginBody = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

const profileBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    available: z.boolean(),
  })
  .partial();

const passwordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export async function authRoutes(app: FastifyInstance) {
  // Self-service sign-up is for customers. Agents are invited by an admin.
  app.post('/auth/signup', async (request, reply) => {
    const body = parse(signupBody, request.body);
    const user = await createUser(app.db, { ...body, role: 'customer' }, app.config.bcryptRounds);
    await startSession(app, reply, user);
    return reply.status(201).send(toUserDto(user));
  });

  app.post('/auth/login', async (request, reply) => {
    const body = parse(loginBody, request.body);
    const user = await findUserByEmail(app.db, body.email);
    // Same message whether the email is unknown or the password is wrong.
    if (!user || !user.active || !(await verifyPassword(user, body.password))) {
      throw unauthorized('Email or password is incorrect');
    }
    await startSession(app, reply, user);
    return toUserDto(user);
  });

  app.post('/auth/logout', async (_request, reply) => {
    endSession(reply);
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: app.authenticate }, async (request) => {
    return toUserDto(currentUser(request));
  });

  app.patch('/auth/me', { preHandler: app.authenticate }, async (request) => {
    const user = currentUser(request);
    const body = parse(profileBody, request.body);
    if (body.available !== undefined && !isStaff(user)) {
      throw badRequest('Only agents have an availability setting');
    }
    const updated = await updateUser(app.db, user, user.id, body);
    return toUserDto(updated);
  });

  app.post('/auth/password', { preHandler: app.authenticate }, async (request, reply) => {
    const body = parse(passwordBody, request.body);
    await changePassword(
      app.db,
      currentUser(request),
      body.currentPassword,
      body.newPassword,
      app.config.bcryptRounds,
    );
    return reply.status(204).send();
  });
}
