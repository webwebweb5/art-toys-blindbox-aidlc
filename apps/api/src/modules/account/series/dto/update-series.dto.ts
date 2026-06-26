import { z } from 'zod';

export const updateSeriesSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  artist: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  pricePerBox: z.number().positive().optional(),
  coverImage: z.string().optional(),
  pityThreshold: z.number().int().min(1).optional(),
  pityMultiplier: z.number().min(1).max(10).optional(),
  // Figures are only editable while the series is in DRAFT. When provided,
  // they REPLACE the existing figure set (probabilities must sum to 100%).
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
    .min(1)
    .optional(),
});

export type UpdateSeriesDto = z.infer<typeof updateSeriesSchema>;
