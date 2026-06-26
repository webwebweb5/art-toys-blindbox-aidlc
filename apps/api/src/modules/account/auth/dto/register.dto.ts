import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  referralCode: z.string().optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
