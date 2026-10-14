import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../middleware/http-error';
import { createAuthenticate, requireStudent } from '../auth/auth.middleware';
import type { AuthDependencies } from '../auth/auth.dependencies';
import { equipmentRepository } from './equipment.repository';
import {
  browseEquipmentQuerySchema,
  createEquipmentSchema,
  myEquipmentQuerySchema,
  updateEquipmentSchema,
} from './equipment.validation';
import type { EquipmentRepository } from './equipment.types';

const idSchema = z.string().uuid();

function requireId(value: unknown): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'The equipment ID is invalid.');
  }
  return parsed.data;
}

function requireQuery<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T } }, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success || result.data === undefined) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'The query parameters are invalid.');
  }
  return result.data;
}

function requireBody<T>(
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success || result.data === undefined) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'The request body is invalid.');
  }
  return result.data;
}

function pagedResponse(result: {
  items: unknown[];
  page: number;
  pageSize: number;
  total: number;
}) {
  return {
    items: result.items,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / result.pageSize),
    },
  };
}

export function createEquipmentRouter(
  authDependencies: AuthDependencies,
  repository: EquipmentRepository = equipmentRepository,
): Router {
  const router = Router();
  const authenticate = createAuthenticate(authDependencies);

  router.get('/', async (request, response) => {
    const query = requireQuery(browseEquipmentQuerySchema, request.query);
    const result = await repository.browse({
      page: query.page,
      pageSize: query.pageSize,
      query: query.q,
      q: query.q,
      category: query.category,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort: query.sort,
    });
    response.status(200).json(pagedResponse(result));
  });

  router.post('/', authenticate, requireStudent, async (request, response) => {
    const body = requireBody(createEquipmentSchema, request.body);
    const listing = await repository.create(request.authUser!.id, body);
    if (!listing) {
      throw new HttpError(422, 'INVALID_CATEGORY_OR_ORGANIZATION', 'The category or organization is unavailable or unauthorized.');
    }
    response.status(201).json({ equipment: listing });
  });

  router.get('/:id', async (request, response) => {
    const listing = await repository.getById(requireId(request.params.id));
    if (!listing) {
      throw new HttpError(404, 'EQUIPMENT_NOT_FOUND', 'The equipment listing was not found.');
    }
    response.status(200).json({ equipment: listing });
  });

  router.patch('/:id', authenticate, requireStudent, async (request, response) => {
    const id = requireId(request.params.id);
    const body = requireBody(updateEquipmentSchema, request.body);
    const result = await repository.update(id, request.authUser!.id, body);
    if (result === 'not_found') {
      throw new HttpError(404, 'EQUIPMENT_NOT_FOUND', 'The equipment listing was not found.');
    }
    if (result === 'conflict') {
      throw new HttpError(409, 'EQUIPMENT_HAS_BLOCKING_BOOKINGS', 'Equipment with blocking bookings cannot be deactivated.');
    }
    if (result === 'invalid_reference') {
      throw new HttpError(422, 'INVALID_CATEGORY_OR_ORGANIZATION', 'The category or organization is unavailable or unauthorized.');
    }
    response.status(200).json({ equipment: result.listing });
  });

  router.delete('/:id', authenticate, requireStudent, async (request, response) => {
    const result = await repository.archive(requireId(request.params.id), request.authUser!.id);
    if (result === 'not_found') {
      throw new HttpError(404, 'EQUIPMENT_NOT_FOUND', 'The equipment listing was not found.');
    }
    if (result === 'conflict') {
      throw new HttpError(409, 'EQUIPMENT_HAS_BLOCKING_BOOKINGS', 'Equipment with blocking bookings cannot be archived.');
    }
    response.status(200).json({ status: 'archived' });
  });

  return router;
}

export function createCategoriesRouter(
  repository: EquipmentRepository = equipmentRepository,
): Router {
  const router = Router();
  router.get('/', async (_request, response) => {
    const categories = await repository.listCategories();
    response.status(200).json({ items: categories });
  });
  return router;
}

export function createMyEquipmentRouter(
  authDependencies: AuthDependencies,
  repository: EquipmentRepository = equipmentRepository,
): Router {
  const router = Router();
  router.get('/me/equipment', createAuthenticate(authDependencies), requireStudent, async (request, response) => {
    const query = requireQuery(myEquipmentQuerySchema, request.query);
    const result = await repository.listMine(request.authUser!.id, {
      page: query.page,
      pageSize: query.pageSize,
      sort: query.sort,
      status: query.status,
    });
    response.status(200).json(pagedResponse(result));
  });
  return router;
}
