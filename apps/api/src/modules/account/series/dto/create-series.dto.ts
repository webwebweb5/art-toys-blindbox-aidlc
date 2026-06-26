import { z } from 'zod';

export const createSeriesSchema = z.object({
  name: z.string().min(1).max(200),
  artist: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  pricePerBox: z.number().positive(),
  coverImage: z.string().optional(),
  pityThreshold: z.number().int().min(1).default(50),
  pityMultiplier: z.number().min(1).max(10).default(2.0),
  figures: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        image: z.string().optional(),
        rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'SECRET']),
        probability: z.number().min(0).max(100),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1),
});

export type CreateSeriesDto = z.infer<typeof createSeriesSchema>;
