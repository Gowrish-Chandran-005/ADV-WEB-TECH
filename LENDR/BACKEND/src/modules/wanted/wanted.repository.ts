import type { PoolClient } from 'pg';
import { pool } from '../../config/database';
import { nextCalendarDate } from '../bookings/booking.validation';
import type {
  CreateOfferInput,
  CreateWantedRequestInput,
  MatchedEquipmentItem,
  RespondOfferInput,
  UpdateWantedRequestInput,
  WantedAuthorPublic,
  WantedFilterOptions,
  WantedOffer,
  WantedPage,
  WantedRepository,
  WantedRequest,
  WantedStatus,
  WantedUrgency,
} from './wanted.types';

function requirePool() {
  if (!pool) {
    throw new Error('PostgreSQL connection settings are not configured.');
  }
  return pool;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'ST';
  const first = parts[0][0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

function getPublicAuthor(id: string, fullName: string): WantedAuthorPublic {
  return {
    id,
    fullName,
    initials: getInitials(fullName),
  };
}

interface RequestRow {
  id: string;
  user_id: string;
  author_full_name: string;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  title: string;
  description: string;
  location_block: string | null;
  start_date: string | Date;
  end_date: string | Date;
  urgency: WantedUrgency;
  status: WantedStatus;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
  offers_count: string;
}

function formatDate(val: string | Date): string {
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
}

function mapRequest(row: RequestRow): WantedRequest {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    title: row.title,
    description: row.description,
    locationBlock: row.location_block,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    urgency: row.urgency,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    offersCount: Number(row.offers_count || 0),
    author: getPublicAuthor(row.user_id, row.author_full_name),
  };
}

interface OfferRow {
  id: string;
  wanted_request_id: string;
  offerer_user_id: string;
  offerer_name: string;
  equipment_id: string;
  equipment_title: string;
  image_urls: string[] | null;
  daily_rental_price: string;
  security_deposit: string | null;
  message: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  created_at: Date;
  updated_at: Date;
}

function mapOffer(row: OfferRow): WantedOffer {
  return {
    id: row.id,
    wantedRequestId: row.wanted_request_id,
    offererUserId: row.offerer_user_id,
    offererName: row.offerer_name,
    equipmentId: row.equipment_id,
    equipmentTitle: row.equipment_title,
    equipmentImage: row.image_urls?.[0] ?? null,
    dailyRentalPrice: row.daily_rental_price,
    securityDeposit: row.security_deposit,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const selectRequestSql = `
  SELECT
    wr.id,
    wr.user_id,
    u.full_name AS author_full_name,
    wr.category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    wr.title,
    wr.description,
    wr.location_block,
    wr.start_date,
    wr.end_date,
    wr.urgency,
    wr.status,
    wr.expires_at,
    wr.created_at,
    wr.updated_at,
    (SELECT count(*)::text FROM wanted_offers wo WHERE wo.wanted_request_id = wr.id) AS offers_count
  FROM wanted_requests wr
  JOIN users u ON wr.user_id = u.id
  LEFT JOIN categories c ON wr.category_id = c.id
`;

const selectOfferSql = `
  SELECT
    wo.id,
    wo.wanted_request_id,
    wo.offerer_user_id,
    u.full_name AS offerer_name,
    wo.equipment_id,
    e.title AS equipment_title,
    e.image_urls,
    e.daily_rental_price::text,
    e.security_deposit::text,
    wo.message,
    wo.status,
    wo.created_at,
    wo.updated_at
  FROM wanted_offers wo
  JOIN users u ON wo.offerer_user_id = u.id
  JOIN equipment e ON wo.equipment_id = e.id
`;

export const postgresWantedRepository: WantedRepository = {
  async createRequest(userId: string, input: CreateWantedRequestInput): Promise<WantedRequest> {
    const insertSql = `
      INSERT INTO wanted_requests (
        user_id, category_id, title, description, location_block,
        start_date, end_date, urgency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    const values = [
      userId,
      input.categoryId ?? null,
      input.title,
      input.description,
      input.locationBlock ?? null,
      input.startDate,
      input.endDate,
      input.urgency ?? 'MEDIUM',
    ];
    const insertResult = await requirePool().query<{ id: string }>(insertSql, values);
    const newId = insertResult.rows[0].id;
    const full = await this.getRequestById(newId);
    if (!full) {
      throw new Error('Failed to retrieve newly created wanted request.');
    }
    return full;
  },

  async getRequestById(id: string): Promise<WantedRequest | null> {
    const result = await requirePool().query<RequestRow>(
      `${selectRequestSql} WHERE wr.id = $1`,
      [id],
    );
    if (!result.rows[0]) return null;
    return mapRequest(result.rows[0]);
  },

  async listRequests(filters: WantedFilterOptions): Promise<WantedPage> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters.status && filters.status !== 'ALL') {
      conditions.push(`wr.status = $${idx++}`);
      values.push(filters.status);
    } else if (!filters.status) {
      conditions.push(`wr.status = 'OPEN'`);
    }

    if (filters.urgency) {
      conditions.push(`wr.urgency = $${idx++}`);
      values.push(filters.urgency);
    }

    if (filters.category) {
      conditions.push(`(c.slug = $${idx} OR c.id::text = $${idx})`);
      values.push(filters.category);
      idx++;
    }

    if (filters.query) {
      conditions.push(`(wr.title ILIKE $${idx} OR wr.description ILIKE $${idx})`);
      values.push(`%${filters.query}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'ORDER BY wr.created_at DESC';
    if (filters.sort === 'urgent') {
      orderBy = `ORDER BY (CASE WHEN wr.urgency = 'HIGH' THEN 1 ELSE 2 END), wr.created_at DESC`;
    }

    const page = Math.max(1, filters.page);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize));
    const offset = (page - 1) * pageSize;

    const countSql = `
      SELECT count(*)::text as total
      FROM wanted_requests wr
      LEFT JOIN categories c ON wr.category_id = c.id
      ${whereClause}
    `;

    const dataSql = `
      ${selectRequestSql}
      ${whereClause}
      ${orderBy}
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const [countRes, dataRes] = await Promise.all([
      requirePool().query<{ total: string }>(countSql, values),
      requirePool().query<RequestRow>(dataSql, [...values, pageSize, offset]),
    ]);

    const total = Number(countRes.rows[0]?.total ?? 0);

    return {
      items: dataRes.rows.map(mapRequest),
      page,
      pageSize,
      total,
    };
  },

  async updateRequest(
    id: string,
    userId: string,
    input: UpdateWantedRequestInput,
  ): Promise<WantedRequest | 'not_found' | 'not_open'> {
    const existing = await this.getRequestById(id);
    if (!existing || existing.userId !== userId) {
      return 'not_found';
    }
    if (existing.status !== 'OPEN') {
      return 'not_open';
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(input.description);
    }
    if (input.categoryId !== undefined) {
      updates.push(`category_id = $${idx++}`);
      values.push(input.categoryId);
    }
    if (input.locationBlock !== undefined) {
      updates.push(`location_block = $${idx++}`);
      values.push(input.locationBlock);
    }
    if (input.startDate !== undefined) {
      updates.push(`start_date = $${idx++}`);
      values.push(input.startDate);
    }
    if (input.endDate !== undefined) {
      updates.push(`end_date = $${idx++}`);
      values.push(input.endDate);
    }
    if (input.urgency !== undefined) {
      updates.push(`urgency = $${idx++}`);
      values.push(input.urgency);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id, userId);
    const sql = `
      UPDATE wanted_requests
      SET ${updates.join(', ')}
      WHERE id = $${idx++} AND user_id = $${idx++}
    `;
    await requirePool().query(sql, values);
    return (await this.getRequestById(id))!;
  },

  async withdrawRequest(id: string, userId: string): Promise<boolean | 'not_found'> {
    const result = await requirePool().query(
      `UPDATE wanted_requests
       SET status = 'WITHDRAWN'
       WHERE id = $1 AND user_id = $2 AND status <> 'WITHDRAWN'`,
      [id, userId],
    );
    if (result.rowCount === 0) {
      const exists = await this.getRequestById(id);
      if (!exists || exists.userId !== userId) return 'not_found';
      return true; // Already withdrawn
    }
    return true;
  },

  async getOffersForRequest(requestId: string): Promise<WantedOffer[]> {
    const result = await requirePool().query<OfferRow>(
      `${selectOfferSql} WHERE wo.wanted_request_id = $1 ORDER BY wo.created_at DESC`,
      [requestId],
    );
    return result.rows.map(mapOffer);
  },

  async getOfferById(offerId: string): Promise<WantedOffer | null> {
    const result = await requirePool().query<OfferRow>(
      `${selectOfferSql} WHERE wo.id = $1`,
      [offerId],
    );
    if (!result.rows[0]) return null;
    return mapOffer(result.rows[0]);
  },

  async createOffer(offererUserId: string, requestId: string, input: CreateOfferInput) {
    const req = await this.getRequestById(requestId);
    if (!req) return 'request_not_found';
    if (req.status !== 'OPEN' || new Date(req.expiresAt).getTime() <= Date.now()) {
      return 'request_not_open';
    }
    if (req.userId === offererUserId) {
      return 'self_offer';
    }

    // Inspect equipment
    const eqResult = await requirePool().query<{
      id: string;
      owner_user_id: string;
      status: string;
    }>(
      `SELECT id, owner_user_id, status FROM equipment WHERE id = $1`,
      [input.equipmentId],
    );
    const eq = eqResult.rows[0];
    if (!eq) return 'equipment_not_found';
    if (eq.owner_user_id !== offererUserId) return 'equipment_not_owned';
    if (eq.status !== 'ACTIVE') return 'equipment_inactive';

    // Verify equipment availability for request dates
    const startIst = `${req.startDate}T00:00:00.000Z`;
    const nextEnd = nextCalendarDate(req.endDate);
    const endIst = `${nextEnd}T00:00:00.000Z`;

    const bookingConflict = await requirePool().query<{ count: string }>(
      `SELECT count(*)::text as count
       FROM bookings
       WHERE equipment_id = $1
         AND status IN ('PENDING', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED')
         AND start_at < ($3::date::timestamp AT TIME ZONE 'Asia/Kolkata')
         AND end_at > ($2::date::timestamp AT TIME ZONE 'Asia/Kolkata')`,
      [input.equipmentId, req.startDate, nextEnd],
    );
    if (Number(bookingConflict.rows[0]?.count || 0) > 0) {
      return 'equipment_unavailable';
    }

    const maintConflict = await requirePool().query<{ count: string }>(
      `SELECT count(*)::text as count
       FROM maintenance_blocks
       WHERE equipment_id = $1
         AND start_at < ($3::date::timestamp AT TIME ZONE 'Asia/Kolkata')
         AND end_at > ($2::date::timestamp AT TIME ZONE 'Asia/Kolkata')`,
      [input.equipmentId, req.startDate, nextEnd],
    );
    if (Number(maintConflict.rows[0]?.count || 0) > 0) {
      return 'equipment_unavailable';
    }

    // Check duplicate pending offer
    const dupCheck = await requirePool().query<{ count: string }>(
      `SELECT count(*)::text as count
       FROM wanted_offers
       WHERE wanted_request_id = $1 AND offerer_user_id = $2 AND equipment_id = $3 AND status = 'PENDING'`,
      [requestId, offererUserId, input.equipmentId],
    );
    if (Number(dupCheck.rows[0]?.count || 0) > 0) {
      return 'duplicate_offer';
    }

    const insertResult = await requirePool().query<{ id: string }>(
      `INSERT INTO wanted_offers (wanted_request_id, offerer_user_id, equipment_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [requestId, offererUserId, input.equipmentId, input.message ?? null],
    );

    const offer = await this.getOfferById(insertResult.rows[0].id);
    return {
      offer: offer!,
      request: req,
      equipmentOwnerId: offererUserId,
    };
  },

  async respondToOffer(
    authorUserId: string,
    offerId: string,
    input: RespondOfferInput,
  ) {
    const client: PoolClient = await requirePool().connect();
    try {
      await client.query('BEGIN');

      // 1. Lock and select offer
      const offerRes = await client.query<{
        id: string;
        wanted_request_id: string;
        offerer_user_id: string;
        equipment_id: string;
        status: string;
      }>(
        `SELECT id, wanted_request_id, offerer_user_id, equipment_id, status
         FROM wanted_offers
         WHERE id = $1
         FOR UPDATE`,
        [offerId],
      );
      const offerRow = offerRes.rows[0];
      if (!offerRow) {
        await client.query('ROLLBACK');
        return 'offer_not_found';
      }

      // 2. Lock and select wanted request
      const reqRes = await client.query<{
        id: string;
        user_id: string;
        status: string;
        start_date: string | Date;
        end_date: string | Date;
      }>(
        `SELECT id, user_id, status, start_date, end_date
         FROM wanted_requests
         WHERE id = $1
         FOR UPDATE`,
        [offerRow.wanted_request_id],
      );
      const reqRow = reqRes.rows[0];
      if (!reqRow) {
        await client.query('ROLLBACK');
        return 'request_not_found';
      }

      // Authorization: Only the request author can accept/decline
      if (reqRow.user_id !== authorUserId) {
        await client.query('ROLLBACK');
        return 'forbidden';
      }

      if (offerRow.status !== 'PENDING') {
        await client.query('ROLLBACK');
        return 'offer_not_pending';
      }

      if (input.action === 'accept') {
        if (reqRow.status !== 'OPEN') {
          await client.query('ROLLBACK');
          return 'request_not_open';
        }

        // Verify no other offer was already accepted
        const alreadyAcceptedRes = await client.query<{ count: string }>(
          `SELECT count(*)::text as count
           FROM wanted_offers
           WHERE wanted_request_id = $1 AND status = 'ACCEPTED'`,
          [reqRow.id],
        );
        if (Number(alreadyAcceptedRes.rows[0]?.count || 0) > 0) {
          await client.query('ROLLBACK');
          return 'already_accepted';
        }

        // Check equipment availability
        const startDateStr = formatDate(reqRow.start_date);
        const nextEnd = nextCalendarDate(formatDate(reqRow.end_date));

        const conflictCheck = await client.query<{ count: string }>(
          `SELECT count(*)::text as count
           FROM bookings
           WHERE equipment_id = $1
             AND status IN ('PENDING', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED')
             AND start_at < ($3::date::timestamp AT TIME ZONE 'Asia/Kolkata')
             AND end_at > ($2::date::timestamp AT TIME ZONE 'Asia/Kolkata')`,
          [offerRow.equipment_id, startDateStr, nextEnd],
        );
        if (Number(conflictCheck.rows[0]?.count || 0) > 0) {
          await client.query('ROLLBACK');
          return 'equipment_unavailable';
        }

        // Update offer to ACCEPTED
        await client.query(
          `UPDATE wanted_offers SET status = 'ACCEPTED' WHERE id = $1`,
          [offerId],
        );

        // Update request to FULFILLED
        await client.query(
          `UPDATE wanted_requests SET status = 'FULFILLED' WHERE id = $1`,
          [reqRow.id],
        );
      } else {
        // Decline offer
        await client.query(
          `UPDATE wanted_offers SET status = 'DECLINED' WHERE id = $1`,
          [offerId],
        );
      }

      await client.query('COMMIT');

      const updatedOffer = await this.getOfferById(offerId);
      const updatedReq = await this.getRequestById(offerRow.wanted_request_id);

      return {
        offer: updatedOffer!,
        request: updatedReq!,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findMatchesForRequest(requestId: string): Promise<MatchedEquipmentItem[]> {
    const req = await this.getRequestById(requestId);
    if (!req) return [];

    const nextEnd = nextCalendarDate(req.endDate);

    // Deterministic match query
    // 1. Equipment active
    // 2. Owner != requester
    // 3. Category match OR keyword match in title, description, tags, use_cases
    // 4. No conflicting booking or maintenance block for requested dates
    const query = `
      SELECT
        e.id,
        e.title,
        e.description,
        c.name AS category_name,
        c.slug AS category_slug,
        e.daily_rental_price::text,
        e.security_deposit::text,
        e.pickup_location,
        e.condition,
        e.image_urls,
        e.owner_user_id
      FROM equipment e
      JOIN categories c ON e.category_id = c.id
      WHERE e.status = 'ACTIVE'
        AND e.owner_user_id <> $1
        AND (
          ($2::uuid IS NOT NULL AND e.category_id = $2::uuid)
          OR e.title ILIKE $3
          OR e.description ILIKE $3
          OR $4 = ANY(e.use_cases)
        )
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.equipment_id = e.id
            AND b.status IN ('PENDING', 'APPROVED', 'ACTIVE', 'RETURN_REQUESTED')
            AND b.start_at < ($6::date::timestamp AT TIME ZONE 'Asia/Kolkata')
            AND b.end_at > ($5::date::timestamp AT TIME ZONE 'Asia/Kolkata')
        )
        AND NOT EXISTS (
          SELECT 1 FROM maintenance_blocks mb
          WHERE mb.equipment_id = e.id
            AND mb.start_at < ($6::date::timestamp AT TIME ZONE 'Asia/Kolkata')
            AND mb.end_at > ($5::date::timestamp AT TIME ZONE 'Asia/Kolkata')
        )
      LIMIT 10
    `;

    // Extract first keyword from title
    const firstWord = req.title.trim().split(/\s+/)[0] || '';
    const keywordPattern = `%${firstWord}%`;

    const result = await requirePool().query<{
      id: string;
      title: string;
      description: string;
      category_name: string;
      category_slug: string;
      daily_rental_price: string;
      security_deposit: string | null;
      pickup_location: string;
      condition: string;
      image_urls: string[] | null;
      owner_user_id: string;
    }>(query, [
      req.userId,
      req.categoryId,
      keywordPattern,
      req.categorySlug || 'none',
      req.startDate,
      nextEnd,
    ]);

    return result.rows.map((row) => {
      const matchReasons: string[] = [];
      if (req.categoryId && row.category_name === req.categoryName) {
        matchReasons.push(`Category match: ${row.category_name}`);
      }
      if (row.title.toLowerCase().includes(firstWord.toLowerCase())) {
        matchReasons.push(`Title matches keyword "${firstWord}"`);
      }
      matchReasons.push(`Available for ${req.startDate} to ${req.endDate}`);

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        categoryName: row.category_name,
        categorySlug: row.category_slug,
        dailyRentalPrice: row.daily_rental_price,
        securityDeposit: row.security_deposit,
        pickupLocation: row.pickup_location,
        condition: row.condition,
        imageUrls: row.image_urls ?? [],
        ownerUserId: row.owner_user_id,
        matchReasons,
      };
    });
  },
};
