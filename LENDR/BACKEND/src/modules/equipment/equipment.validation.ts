import { z } from 'zod';

const uuid = z.string().uuid();
const money = z.number().finite().min(0).max(99_999_999.99).multipleOf(0.01);
const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);
const stringList = (maxCount: number, maxLength: number) =>
  z.array(nonEmptyText(maxLength)).max(maxCount).default([]);

const imageUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (value.startsWith('/uploads/') && value.length > 9) {
      return true;
    }
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'Image URLs must use HTTP or HTTPS, or be a valid /uploads/ path.');

const equipmentFields = {
  organizationId: uuid.nullable().optional(),
  categoryId: uuid,
  title: nonEmptyText(160),
  description: nonEmptyText(10_000),
  tags: stringList(30, 50),
  features: stringList(50, 100),
  useCases: stringList(50, 100),
  specifications: z.record(z.string(), z.unknown()).default({}),
  imageUrls: z.array(imageUrl).max(10).default([]),
  dailyRentalPrice: money,
  securityDeposit: money.nullable().optional(),
  maxRentalDays: z.number().int().min(1).max(365).default(30),
  pickupLocation: nonEmptyText(120),
  condition: z.enum(['UNKNOWN', 'NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
} satisfies z.ZodRawShape;

export const createEquipmentSchema = z.object(equipmentFields).strict();

export const updateEquipmentSchema = z
  .object({
    organizationId: uuid.nullable().optional(),
    categoryId: uuid.optional(),
    title: nonEmptyText(160).optional(),
    description: nonEmptyText(10_000).optional(),
    tags: stringList(30, 50).optional(),
    features: stringList(50, 100).optional(),
    useCases: stringList(50, 100).optional(),
    specifications: z.record(z.string(), z.unknown()).optional(),
    imageUrls: z.array(imageUrl).max(10).optional(),
    dailyRentalPrice: money.optional(),
    securityDeposit: money.nullable().optional(),
    maxRentalDays: z.number().int().min(1).max(365).optional(),
    pickupLocation: nonEmptyText(120).optional(),
    condition: z.enum(['UNKNOWN', 'NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one equipment field must be provided.',
  });

const paginationShape = {
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
};

export const browseEquipmentQuerySchema = z
  .object({
    ...paginationShape,
    q: z.string().trim().min(1).max(200).optional(),
    category: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    minPrice: z.coerce.number().finite().min(0).max(99_999_999.99).optional(),
    maxPrice: z.coerce.number().finite().min(0).max(99_999_999.99).optional(),
    status: z.literal('ACTIVE').optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  })
  .strict()
  .refine(
    (value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice,
    { message: 'minPrice must be less than or equal to maxPrice.' },
  );

export const myEquipmentQuerySchema = z
  .object({
    ...paginationShape,
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED']).optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  })
  .strict();

export type CreateEquipmentBody = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentBody = z.infer<typeof updateEquipmentSchema>;
export type BrowseEquipmentQuery = z.infer<typeof browseEquipmentQuerySchema>;
export type MyEquipmentQuery = z.infer<typeof myEquipmentQuerySchema>;
