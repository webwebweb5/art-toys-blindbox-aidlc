import { z } from 'zod';

export const createDropSchema = z.object({
  seriesId: z.string().uuid(),
  name: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  totalQuantity: z.number().int().positive(),
  perPersonLimit: z.number().int().positive().default(1),
  earlyAccessMinutes: z.number().int().min(0).default(0),
  earlyAccessMinTier: z
    .enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'])
    .optional(),
});

export type CreateDropDto = z.infer<typeof createDropSchema>;
