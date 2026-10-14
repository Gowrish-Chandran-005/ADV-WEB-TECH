import type { PoolClient } from 'pg';

export type EquipmentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type EquipmentCondition = 'UNKNOWN' | 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';

export interface EquipmentInput {
  organizationId?: string | null;
  categoryId: string;
  title: string;
  description: string;
  tags: string[];
  features: string[];
  useCases: string[];
  specifications: Record<string, unknown>;
  imageUrls: string[];
  dailyRentalPrice: number;
  securityDeposit?: number | null;
  maxRentalDays: number;
  pickupLocation: string;
  condition?: EquipmentCondition;
  status?: 'ACTIVE' | 'INACTIVE';
}

export type EquipmentUpdate = Partial<EquipmentInput>;

export interface EquipmentFilters {
  page: number;
  pageSize: number;
  query?: string;
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: 'newest' | 'price_asc' | 'price_desc';
  ownerId?: string;
  status?: EquipmentStatus;
}

export interface EquipmentListing {
  id: string;
  ownerUserId: string;
  ownerFullName: string;
  organizationId: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  title: string;
  description: string;
  tags: string[];
  features: string[];
  useCases: string[];
  specifications: Record<string, unknown>;
  imageUrls: string[];
  dailyRentalPrice: string;
  securityDeposit: string | null;
  maxRentalDays: number;
  pickupLocation: string;
  condition: EquipmentCondition;
  status: EquipmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface EquipmentRepository {
  listCategories(): Promise<Category[]>;
  create(ownerUserId: string, input: EquipmentInput): Promise<EquipmentListing | null>;
  browse(filters: EquipmentFilters): Promise<PagedResult<EquipmentListing>>;
  getById(id: string, requesterId?: string): Promise<EquipmentListing | null>;
  listMine(ownerUserId: string, filters: EquipmentFilters): Promise<PagedResult<EquipmentListing>>;
  update(
    id: string,
    userId: string,
    input: EquipmentUpdate,
  ): Promise<{ listing: EquipmentListing } | 'not_found' | 'conflict' | 'invalid_reference'>;
  archive(id: string, userId: string): Promise<'archived' | 'not_found' | 'conflict'>;
  addFavorite(userId: string, equipmentId: string): Promise<boolean>;
  removeFavorite(userId: string, equipmentId: string): Promise<void>;
  listFavorites(userId: string, page: number, pageSize: number): Promise<PagedResult<EquipmentListing>>;
}

export interface EquipmentQueryClient extends Pick<PoolClient, 'query'> {}
