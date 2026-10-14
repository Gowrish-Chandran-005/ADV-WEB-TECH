import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../middleware/http-error';
import { createAuthenticate, requireStudent } from '../auth/auth.middleware';
import type { AuthDependencies } from '../auth/auth.dependencies';
import { postgresNotificationsRepository } from './notifications.repository';
import type { NotificationsRepository } from './notifications.types';

const idSchema = z.string().uuid();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export function createNotificationsRouter(
  authDependencies: AuthDependencies,
  repository: NotificationsRepository = postgresNotificationsRepository,
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);
  const student = [authenticate, requireStudent] as const;

  router.get('/', ...student, async (request, response) => {
    const parsedQuery = listQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'The query parameters are invalid.');
    }

    const { page, pageSize } = parsedQuery.data;
    const result = await repository.listForUser(request.authUser!.id, { page, pageSize });

    response.status(200).json({
      items: result.items,
      unreadCount: result.unreadCount,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize) || 1,
      },
    });
  });

  router.patch('/:id/read', ...student, async (request, response) => {
    const parsedId = idSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'The notification ID is invalid.');
    }

    const updated = await repository.markAsRead(parsedId.data, request.authUser!.id);
    if (!updated) {
      throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'The notification was not found.');
    }

    response.status(200).json({ notification: updated });
  });

  router.post('/read-all', ...student, async (request, response) => {
    const count = await repository.markAllAsRead(request.authUser!.id);
    response.status(200).json({ status: 'success', markedCount: count });
  });

  return router;
}
