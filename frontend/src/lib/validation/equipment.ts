import { z } from 'zod';

export const equipmentConditionValues = ['Excellent', 'Good', 'Fair', 'Needs Repair'] as const;

export const equipmentFormSchema = z.object({
  name: z.string().trim().min(2, 'Equipment name is required.').max(120, 'Name is too long.'),
  category_id: z.string().trim().min(1, 'Category is required.'),
  brand: z.string().trim().max(80, 'Brand is too long.').optional().or(z.literal('')),
  model: z.string().trim().max(80, 'Model is too long.').optional().or(z.literal('')),
  description: z.string().trim().max(1200, 'Description is too long.').optional().or(z.literal('')),
  condition: z.union([
    z.literal('Excellent'),
    z.literal('Good'),
    z.literal('Fair'),
    z.literal('Needs Repair'),
  ]),
  price_per_day: z.coerce.number().min(0, 'Price per day must be 0 or higher.'),
  security_deposit: z.coerce.number().min(0, 'Security deposit must be 0 or higher.'),
  location: z.string().trim().max(160, 'Location is too long.').optional().or(z.literal('')),
  is_published: z.boolean().default(true),
});

export type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;
