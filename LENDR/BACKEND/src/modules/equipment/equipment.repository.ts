import type { PoolClient } from 'pg';
import { pool } from '../../config/database';
import type {
  Category,
  EquipmentFilters,
  EquipmentInput,
  EquipmentListing,
  EquipmentQueryClient,
  EquipmentRepository,
  EquipmentUpdate,
  PagedResult,
} from './equipment.types';

const equipmentFields = `
  e.id,
  e.owner_user_id AS "ownerUserId",
  owner.full_name AS "ownerFullName",
  e.organization_id AS "organizationId",
  e.category_id AS "categoryId",
  category.name AS "categoryName",
  category.slug AS "categorySlug",
  e.title,
  e.description,
  e.tags,
  e.features,
  e.use_cases AS "useCases",
  e.specifications,
  e.image_urls AS "imageUrls",
  e.daily_rental_price AS "dailyRentalPrice",
  e.security_deposit AS "securityDeposit",
  e.max_rental_days AS "maxRentalDays",
  e.pickup_location AS "pickupLocation",
  e.condition,
  e.status,
  e.created_at AS "createdAt",
  e.updated_at AS "updatedAt"`;

const sortSql = {
  newest: 'e.created_at DESC, e.id DESC',
  price_asc: 'e.daily_rental_price ASC, e.created_at DESC, e.id DESC',
  price_desc: 'e.daily_rental_price DESC, e.created_at DESC, e.id DESC',
} as const;

function requirePool() {
  if (!pool) {
    throw new Error('PostgreSQL connection settings are not configured.');
  }
  return pool;
}

function appendFilter(
  conditions: string[],
  values: unknown[],
  expression: string,
  value: unknown,
): void {
  values.push(value);
  conditions.push(expression.replace('?', `$${values.length}`));
}

function baseFilters(filters: EquipmentFilters): { conditions: string[]; values: unknown[] } {
  const conditions = ['true'];
  const values: unknown[] = [];

  if (filters.ownerId) {
    appendFilter(conditions, values, 'e.owner_user_id = ?', filters.ownerId);
  } else {
    conditions.push("e.status = 'ACTIVE' AND category.is_active = true");
  }
  if (filters.status) {
    appendFilter(conditions, values, 'e.status = ?', filters.status);
  }
  if (filters.category) {
    appendFilter(conditions, values, 'category.slug = ?', filters.category);
  }
  if (filters.minPrice !== undefined) {
    appendFilter(conditions, values, 'e.daily_rental_price >= ?', filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    appendFilter(conditions, values, 'e.daily_rental_price <= ?', filters.maxPrice);
  }
  const rawSearch = filters.query ?? filters.q;
  if (rawSearch) {
    const trimmed = rawSearch.trim();
    if (trimmed.length > 0) {
      values.push(`%${trimmed.replace(/[\\%_]/g, '\\$&')}%`);
      const placeholder = `$${values.length}`;
      conditions.push(`(
        e.title ILIKE ${placeholder} ESCAPE '\\'
        OR e.description ILIKE ${placeholder} ESCAPE '\\'
        OR category.name ILIKE ${placeholder} ESCAPE '\\'
        OR category.slug ILIKE ${placeholder} ESCAPE '\\'
        OR array_to_string(e.tags, ' ') ILIKE ${placeholder} ESCAPE '\\'
        OR array_to_string(e.features, ' ') ILIKE ${placeholder} ESCAPE '\\'
        OR array_to_string(e.use_cases, ' ') ILIKE ${placeholder} ESCAPE '\\'
        OR e.specifications::text ILIKE ${placeholder} ESCAPE '\\'
        OR e.pickup_location ILIKE ${placeholder} ESCAPE '\\'
      )`);
    }
  }

  return { conditions, values };
}

async function pagedEquipmentQuery(
  client: EquipmentQueryClient,
  filters: EquipmentFilters,
): Promise<PagedResult<EquipmentListing>> {
  const { conditions, values } = baseFilters(filters);
  const where = conditions.join(' AND ');
  const countResult = await client.query<{ total: string }>(
    `SELECT count(*)::text AS total
     FROM equipment e
     JOIN users owner ON owner.id = e.owner_user_id
     JOIN categories category ON category.id = e.category_id
     WHERE ${where}`,
    values,
  );
  const pageValues = [...values, filters.pageSize, (filters.page - 1) * filters.pageSize];
  const result = await client.query<EquipmentListing>(
    `SELECT ${equipmentFields}
     FROM equipment e
     JOIN users owner ON owner.id = e.owner_user_id
     JOIN categories category ON category.id = e.category_id
     WHERE ${where}
     ORDER BY ${sortSql[filters.sort]}
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues,
  );

  return {
    items: result.rows,
    page: filters.page,
    pageSize: filters.pageSize,
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

export async function hasOrganizationManagementAccess(
  client: EquipmentQueryClient,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1
     FROM organization_memberships membership
     JOIN organizations organization ON organization.id = membership.organization_id
     WHERE membership.organization_id = $1
       AND membership.user_id = $2
       AND membership.status = 'ACTIVE'
       AND membership.membership_role IN ('OWNER', 'ADMIN')
       AND organization.status = 'ACTIVE'
     FOR SHARE OF membership, organization`,
    [organizationId, userId],
  );
  return (result.rowCount ?? 0) === 1;
}

export async function canManageEquipment(
  client: EquipmentQueryClient,
  equipment: { owner_user_id: string; organization_id: string | null },
  userId: string,
): Promise<boolean> {
  if (equipment.owner_user_id === userId) {
    return true;
  }
  if (!equipment.organization_id) {
    return false;
  }
  return hasOrganizationManagementAccess(client, equipment.organization_id, userId);
}

async function hasBlockingBookings(client: EquipmentQueryClient, equipmentId: string): Promise<boolean> {
  const result = await client.query(
    `SELECT 1
     FROM bookings
     WHERE equipment_id = $1
       AND status IN ('PENDING', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED')
     LIMIT 1`,
    [equipmentId],
  );
  return (result.rowCount ?? 0) > 0;
}

const inputColumns: Record<keyof EquipmentInput, string> = {
  organizationId: 'organization_id',
  categoryId: 'category_id',
  title: 'title',
  description: 'description',
  tags: 'tags',
  features: 'features',
  useCases: 'use_cases',
  specifications: 'specifications',
  imageUrls: 'image_urls',
  dailyRentalPrice: 'daily_rental_price',
  securityDeposit: 'security_deposit',
  maxRentalDays: 'max_rental_days',
  pickupLocation: 'pickup_location',
  condition: 'condition',
  status: 'status',
};

async function validateCategory(
  client: EquipmentQueryClient,
  categoryId: string,
): Promise<boolean> {
  const result = await client.query(
    'SELECT 1 FROM categories WHERE id = $1 AND is_active = true',
    [categoryId],
  );
  return (result.rowCount ?? 0) === 1;
}

async function validateOrganization(
  client: EquipmentQueryClient,
  organizationId: string | null | undefined,
  userId: string,
): Promise<boolean> {
  return organizationId === undefined || organizationId === null
    ? true
    : hasOrganizationManagementAccess(client, organizationId, userId);
}

export const equipmentRepository: EquipmentRepository = {
  async listCategories(): Promise<Category[]> {
    const result = await requirePool().query<Category>(
      'SELECT id, name, slug FROM categories WHERE is_active = true ORDER BY name ASC',
    );
    return result.rows;
  },

  async create(ownerUserId: string, input: EquipmentInput): Promise<EquipmentListing | null> {
    const database = requirePool();
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      if (!(await validateCategory(client, input.categoryId))) {
        await client.query('ROLLBACK');
        return null;
      }
      if (!(await validateOrganization(client, input.organizationId, ownerUserId))) {
        await client.query('ROLLBACK');
        return null;
      }

      const result = await client.query<EquipmentListing>(
        `INSERT INTO equipment (
           owner_user_id, organization_id, category_id, title, description,
           tags, features, use_cases, specifications, image_urls,
           daily_rental_price, security_deposit, max_rental_days,
           pickup_location, condition, status
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10,
           $11, $12, $13, $14, COALESCE($15, 'UNKNOWN'), COALESCE($16, 'ACTIVE')
         )
         RETURNING id`,
        [
          ownerUserId,
          input.organizationId ?? null,
          input.categoryId,
          input.title,
          input.description,
          input.tags,
          input.features,
          input.useCases,
          JSON.stringify(input.specifications),
          input.imageUrls,
          input.dailyRentalPrice,
          input.securityDeposit ?? null,
          input.maxRentalDays,
          input.pickupLocation,
          input.condition ?? null,
          input.status ?? null,
        ],
      );
      const listing = await selectEquipmentById(client, result.rows[0].id);
      await client.query('COMMIT');
      return listing;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async browse(filters): Promise<PagedResult<EquipmentListing>> {
    return pagedEquipmentQuery(requirePool(), filters);
  },

  async getById(id, requesterId): Promise<EquipmentListing | null> {
    const result = await requirePool().query<EquipmentListing>(
      `SELECT ${equipmentFields}
       FROM equipment e
       JOIN users owner ON owner.id = e.owner_user_id
       JOIN categories category ON category.id = e.category_id
       WHERE e.id = $1
         AND (
           (e.status = 'ACTIVE' AND category.is_active = true)
           OR e.owner_user_id = $2
           OR EXISTS (
             SELECT 1
             FROM organization_memberships membership
             JOIN organizations organization ON organization.id = membership.organization_id
             WHERE membership.organization_id = e.organization_id
               AND membership.user_id = $2
               AND membership.status = 'ACTIVE'
               AND membership.membership_role IN ('OWNER', 'ADMIN')
               AND organization.status = 'ACTIVE'
           )
         )`,
      [id, requesterId ?? null],
    );
    return result.rows[0] ?? null;
  },

  async listMine(ownerUserId, filters): Promise<PagedResult<EquipmentListing>> {
    return pagedEquipmentQuery({ query: requirePool().query.bind(requirePool()) }, {
      ...filters,
      ownerId: ownerUserId,
    });
  },

  async update(
    id: string,
    userId,
    input: EquipmentUpdate,
  ): Promise<{ listing: EquipmentListing } | 'not_found' | 'conflict' | 'invalid_reference'> {
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');
      const currentResult = await client.query<{
        id: string;
        owner_user_id: string;
        organization_id: string | null;
        status: string;
      }>(
        `SELECT id, owner_user_id, organization_id, status
         FROM equipment
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );
      const current = currentResult.rows[0];
      if (!current || !(await canManageEquipment(client, current, userId))) {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      if (current.status === 'ARCHIVED' || current.status === 'SUSPENDED') {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      if (input.categoryId && !(await validateCategory(client, input.categoryId))) {
        await client.query('ROLLBACK');
        return 'invalid_reference';
      }
      if (!(await validateOrganization(client, input.organizationId, userId))) {
        await client.query('ROLLBACK');
        return 'invalid_reference';
      }
      if (input.status === 'INACTIVE' && await hasBlockingBookings(client, id)) {
        await client.query('ROLLBACK');
        return 'conflict';
      }

      const values: unknown[] = [id];
      const assignments: string[] = [];
      for (const [key, value] of Object.entries(input) as [keyof EquipmentInput, unknown][]) {
        values.push(key === 'specifications' ? JSON.stringify(value) : value);
        const cast = key === 'specifications' ? '::jsonb' : '';
        assignments.push(`${inputColumns[key]} = $${values.length}${cast}`);
      }
      assignments.push('updated_at = CURRENT_TIMESTAMP');
      await client.query(
        `UPDATE equipment SET ${assignments.join(', ')} WHERE id = $1`,
        values,
      );
      const listing = await selectEquipmentById(client, id);
      await client.query('COMMIT');
      return { listing };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async archive(id, userId): Promise<'archived' | 'not_found' | 'conflict'> {
    const client = await requirePool().connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{
        id: string;
        owner_user_id: string;
        organization_id: string | null;
      }>(
        `SELECT id, owner_user_id, organization_id
         FROM equipment
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );
      const equipment = result.rows[0];
      if (!equipment || !(await canManageEquipment(client, equipment, userId))) {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      if (await hasBlockingBookings(client, id)) {
        await client.query('ROLLBACK');
        return 'conflict';
      }
      await client.query(
        `UPDATE equipment
         SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id],
      );
      await client.query('COMMIT');
      return 'archived';
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async addFavorite(userId, equipmentId): Promise<boolean> {
    const result = await requirePool().query(
      `INSERT INTO favorites (user_id, equipment_id)
       SELECT $1, equipment.id
       FROM equipment
       JOIN categories ON categories.id = equipment.category_id
       WHERE equipment.id = $2
         AND equipment.status = 'ACTIVE'
         AND categories.is_active = true
       ON CONFLICT (user_id, equipment_id) DO NOTHING`,
      [userId, equipmentId],
    );
    if ((result.rowCount ?? 0) === 0) {
      const exists = await requirePool().query(
        `SELECT 1 FROM equipment
         JOIN categories ON categories.id = equipment.category_id
         WHERE equipment.id = $1
           AND equipment.status = 'ACTIVE'
           AND categories.is_active = true`,
        [equipmentId],
      );
      if ((exists.rowCount ?? 0) === 0) {
        return false;
      }
    }
    return true;
  },

  async removeFavorite(userId, equipmentId): Promise<void> {
    await requirePool().query(
      'DELETE FROM favorites WHERE user_id = $1 AND equipment_id = $2',
      [userId, equipmentId],
    );
  },

  async listFavorites(userId, page, pageSize): Promise<PagedResult<EquipmentListing>> {
    const database = requirePool();
    const [count, result] = await Promise.all([
      database.query<{ total: string }>(
        'SELECT count(*)::text AS total FROM favorites WHERE user_id = $1',
        [userId],
      ),
      database.query<EquipmentListing>(
        `SELECT ${equipmentFields}
         FROM favorites favorite
         JOIN equipment e ON e.id = favorite.equipment_id
         JOIN users owner ON owner.id = e.owner_user_id
         JOIN categories category ON category.id = e.category_id
         WHERE favorite.user_id = $1
         ORDER BY favorite.created_at DESC, e.id DESC
         LIMIT $2 OFFSET $3`,
        [userId, pageSize, (page - 1) * pageSize],
      ),
    ]);
    return { items: result.rows, page, pageSize, total: Number(count.rows[0]?.total ?? 0) };
  },
};

async function selectEquipmentById(
  client: Pick<PoolClient, 'query'>,
  id: string,
): Promise<EquipmentListing> {
  const result = await client.query<EquipmentListing>(
    `SELECT ${equipmentFields}
     FROM equipment e
     JOIN users owner ON owner.id = e.owner_user_id
     JOIN categories category ON category.id = e.category_id
     WHERE e.id = $1`,
    [id],
  );
  return result.rows[0];
}
