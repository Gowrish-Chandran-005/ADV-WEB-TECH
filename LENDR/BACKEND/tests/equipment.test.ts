import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { AuthDependencies } from '../src/modules/auth/auth.dependencies';
import type { AuthUser, UserRepository } from '../src/modules/auth/auth.types';
import type {
  Category,
  EquipmentFilters,
  EquipmentInput,
  EquipmentListing,
  EquipmentRepository,
  EquipmentUpdate,
  PagedResult,
} from '../src/modules/equipment/equipment.types';

const secret = 'equipment-test-secret-with-at-least-thirty-two-characters';
const studentId = '3d33fd4a-f243-4bee-b6cf-5b51175d4077';
const otherStudentId = 'be0bba88-1f5e-45cb-9728-e7a16b4cc78b';
const categoryId = 'a2b72946-d2d1-4ad9-b825-5afad1322c2f';
const equipmentId = 'd873149c-3347-4db8-a65f-a718d5561fc6';

function student(id: string): AuthUser {
  const now = new Date('2026-10-10T00:00:00.000Z');
  return {
    id,
    email: `${id}@vitstudent.ac.in`,
    fullName: 'Equipment Test Student',
    registrationNumber: null,
    phone: null,
    role: 'STUDENT',
    status: 'ACTIVE',
    emailVerifiedAt: null,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function listing(input: Partial<EquipmentListing> = {}): EquipmentListing {
  const now = new Date('2026-10-10T00:00:00.000Z');
  return {
    id: equipmentId,
    ownerUserId: studentId,
    ownerFullName: 'Equipment Test Student',
    organizationId: null,
    categoryId,
    categoryName: 'Electronics',
    categorySlug: 'electronics',
    title: 'Arduino IoT Kit',
    description: 'Kit for an academic electronics project',
    tags: ['arduino'],
    features: ['microcontroller'],
    useCases: ['Arduino/IoT', 'academic projects'],
    specifications: {},
    imageUrls: [],
    dailyRentalPrice: '25.00',
    securityDeposit: null,
    maxRentalDays: 30,
    pickupLocation: 'TT',
    condition: 'GOOD',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

function createHarness() {
  const users = new Map(
    [student(studentId), student(otherStudentId)].map((user) => [user.id, user]),
  );
  const userRepository: UserRepository = {
    async findByEmail() {
      return null;
    },
    async findById(id) {
      return users.get(id) ?? null;
    },
    async createStudent() {
      throw new Error('Not used');
    },
    async updateProfile() {
      throw new Error('Not used');
    },
    async incrementTokenVersion() {},
  };

  const baseListing = listing();
  const repository: EquipmentRepository = {
    async listCategories(): Promise<Category[]> {
      return [{ id: categoryId, name: 'Electronics', slug: 'electronics' }];
    },
    async create(ownerUserId: string, input: EquipmentInput) {
      return listing({ ownerUserId, title: input.title, status: input.status ?? 'ACTIVE' });
    },
    async browse(filters: EquipmentFilters): Promise<PagedResult<EquipmentListing>> {
      return { items: [baseListing], page: filters.page, pageSize: filters.pageSize, total: 1 };
    },
    async getById() {
      return baseListing;
    },
    async listMine(ownerUserId, filters) {
      return {
        items: [listing({ ownerUserId })],
        page: filters.page,
        pageSize: filters.pageSize,
        total: 1,
      };
    },
    async update(_id: string, _userId: string, input: EquipmentUpdate) {
      if (_userId !== studentId) {
        return 'not_found';
      }
      if (input.status === 'INACTIVE') {
        return 'conflict';
      }
      return { listing: listing(input as Partial<EquipmentListing>) };
    },
    async archive() {
      return 'archived';
    },
    async addFavorite() {
      return true;
    },
    async removeFavorite() {},
    async listFavorites(_userId, page, pageSize) {
      return { items: [baseListing], page, pageSize, total: 1 };
    },
  };

  const dependencies: AuthDependencies = {
    users: userRepository,
    jwtSecret: secret,
    passwordHashRounds: 4,
  };
  return { app: createApp(undefined, dependencies, repository), repository };
}

function token(userId = studentId): string {
  return jwt.sign(
    { tokenVersion: 0 },
    secret,
    {
      algorithm: 'HS256',
      audience: 'lendr',
      expiresIn: '1h',
      issuer: 'lendr-api',
      subject: userId,
    },
  );
}

const validCreateBody = {
  categoryId,
  title: 'Arduino IoT Kit',
  description: 'Equipment for an academic project.',
  tags: ['arduino', 'iot'],
  features: ['microcontroller'],
  useCases: ['Arduino/IoT', 'academic projects'],
  specifications: { board: 'Uno' },
  imageUrls: ['https://example.com/kit.jpg'],
  dailyRentalPrice: 25,
  securityDeposit: 100,
  maxRentalDays: 30,
  pickupLocation: 'TT',
};

describe('equipment API', () => {
  it('lists categories and returns paginated equipment results', async () => {
    const { app } = createHarness();
    const categories = await request(app).get('/api/v1/categories');
    const response = await request(app).get('/api/v1/equipment?q=Arduino&page=2&pageSize=5&sort=price_asc');

    expect(categories.status).toBe(200);
    expect(categories.body.items[0]).toMatchObject({ id: categoryId, slug: 'electronics' });
    expect(response.status).toBe(200);
    expect(response.body.items[0].title).toBe('Arduino IoT Kit');
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 5, total: 1, totalPages: 1 });
  });

  it('requires authentication for listing writes and derives owner from the authenticated user', async () => {
    const { app } = createHarness();
    const unauthenticated = await request(app).post('/api/v1/equipment').send(validCreateBody);
    const response = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${token()}`)
      .send({ ...validCreateBody, ownerUserId: otherStudentId });

    expect(unauthenticated.status).toBe(401);
    expect(response.status).toBe(400);
  });

  it.each([
    { ...validCreateBody, dailyRentalPrice: -1 },
    { ...validCreateBody, categoryId: 'not-a-uuid' },
    { ...validCreateBody, imageUrls: ['javascript:alert(1)'] },
    { ...validCreateBody, maxRentalDays: 366 },
    { ...validCreateBody, status: 'ARCHIVED' },
  ])('rejects invalid equipment fields', async (body) => {
    const { app } = createHarness();
    const response = await request(app)
      .post('/api/v1/equipment')
      .set('Authorization', `Bearer ${token()}`)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates owner listings and returns conflict when trying to deactivate a listing with bookings', async () => {
    const { app } = createHarness();
    const update = await request(app)
      .patch(`/api/v1/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ useCases: ['filmmaking', 'night shooting'] });
    const conflict = await request(app)
      .patch(`/api/v1/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ status: 'INACTIVE' });
    const unauthorized = await request(app)
      .patch(`/api/v1/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${token(otherStudentId)}`)
      .send({ title: 'Not mine' });

    expect(update.status).toBe(200);
    expect(update.body.equipment.useCases).toEqual(['filmmaking', 'night shooting']);
    expect(conflict.status).toBe(409);
    expect(unauthorized.status).toBe(404);
  });

  it('archives safely and provides idempotent, private favorites routes', async () => {
    const { app } = createHarness();
    const headers = { Authorization: `Bearer ${token()}` };
    const firstFavorite = await request(app).post(`/api/v1/equipment/${equipmentId}/favorite`).set(headers);
    const duplicateFavorite = await request(app)
      .post(`/api/v1/equipment/${equipmentId}/favorite`)
      .set(headers);
    const favorites = await request(app).get('/api/v1/users/me/favorites').set(headers);
    const remove = await request(app).delete(`/api/v1/equipment/${equipmentId}/favorite`).set(headers);
    const archive = await request(app).delete(`/api/v1/equipment/${equipmentId}`).set(headers);
    const ownListings = await request(app).get('/api/v1/users/me/equipment').set(headers);

    expect(firstFavorite.status).toBe(200);
    expect(duplicateFavorite.status).toBe(200);
    expect(favorites.body.items).toHaveLength(1);
    expect(remove.status).toBe(204);
    expect(archive.body.status).toBe('archived');
    expect(ownListings.status).toBe(200);
  });
});
