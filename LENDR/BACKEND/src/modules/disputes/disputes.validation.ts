import { z } from 'zod';

const evidenceUrlSchema = z
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
  }, 'Evidence URLs must be valid HTTP/HTTPS URLs or uploaded paths starting with /uploads/.');

export const createConditionReportSchema = z
  .object({
    reportType: z.enum(['HANDOVER', 'RETURN', 'DAMAGE_INSPECTION']),
    condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR']),
    notes: z.string().trim().max(3000).default(''),
    evidenceUrls: z.array(evidenceUrlSchema).max(10).default([]),
  })
  .strict();

export const createDamageClaimSchema = z
  .object({
    description: z.string().trim().min(5, 'Description must be at least 5 characters.').max(5000),
    evidenceUrls: z.array(evidenceUrlSchema).min(1, 'At least one photo evidence is required for a damage claim.').max(10),
    proposedFineAmount: z
      .number()
      .finite()
      .min(0, 'Fine amount cannot be negative.')
      .max(999_999.99)
      .multipleOf(0.01)
      .nullable()
      .optional(),
    fineExplanation: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const borrowerClaimResponseSchema = z
  .object({
    response: z.string().trim().min(2, 'Response must be at least 2 characters.').max(5000),
    disputed: z.boolean(),
    evidenceUrls: z.array(evidenceUrlSchema).max(10).default([]),
  })
  .strict();

export const adminReopenClaimSchema = z
  .object({
    reason: z.string().trim().min(5, 'Reopening reason must be at least 5 characters.').max(1000),
  })
  .strict();

export const adminResolveClaimSchema = z
  .object({
    decision: z.enum(['RESOLVED', 'DISMISSED']),
    finalApprovedFine: z
      .number()
      .finite()
      .min(0, 'Approved fine cannot be negative.')
      .max(999_999.99)
      .multipleOf(0.01)
      .nullable()
      .optional(),
    notes: z.string().trim().min(5, 'Admin decision notes must be at least 5 characters.').max(3000),
  })
  .strict();

export const createComplaintSchema = z
  .object({
    bookingId: z.string().uuid().nullable().optional(),
    category: z.string().trim().min(2).max(100),
    description: z.string().trim().min(5).max(5000),
    evidenceUrls: z.array(evidenceUrlSchema).max(10).default([]),
  })
  .strict();

export const updateComplaintSchema = z
  .object({
    status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
    adminNotes: z.string().trim().max(3000).nullable().optional(),
  })
  .strict();
