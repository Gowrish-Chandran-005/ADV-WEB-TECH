import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../middleware/http-error';
import { createAuthenticate, requireStudent } from '../auth/auth.middleware';
import type { AuthDependencies } from '../auth/auth.dependencies';
import { equipmentRepository } from './equipment.repository';
import type { EquipmentRepository } from './equipment.types';

const idSchema = z.string().uuid();
const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export function createFavoriteEquipmentRouter(
  authDependencies: AuthDependencies,
  repository: EquipmentRepository = equipmentRepository,
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);

  router.post('/:id/favorite', authenticate, requireStudent, async (request, response) => {
    const parsedId = idSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'The equipment ID is invalid.');
    }
    const exists = await repository.addFavorite(request.authUser!.id, parsedId.data);
    if (!exists) {
      throw new HttpError(404, 'EQUIPMENT_NOT_FOUND', 'The equipment listing was not found.');
    }
    response.status(200).json({ favorited: true });
  });

  router.delete('/:id/favorite', authenticate, requireStudent, async (request, response) => {
    const parsedId = idSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'The equipment ID is invalid.');
    }
    await repository.removeFavorite(request.authUser!.id, parsedId.data);
    response.status(204).end();
  });

  return router;
}

export function createUserFavoritesRouter(
  authDependencies: AuthDependencies,
  repository: EquipmentRepository = equipmentRepository,
): Router {
  const router = Router();
  router.get('/me/favorites', createAuthenticate(authDependencies), requireStudent, async (request, response) => {
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'The query parameters are invalid.');
    }
    const result = await repository.listFavorites(
      request.authUser!.id,
      parsed.data.page,
      parsed.data.pageSize,
    );
    response.status(200).json({
      items: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  });

  return router;
}
