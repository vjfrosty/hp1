import { z } from 'zod';

/** POST /api/me/age-confirmation */
export const ageConfirmationSchema = z.object({
  confirmed: z.literal(true),
});
export type AgeConfirmationInput = z.infer<typeof ageConfirmationSchema>;

/** Shape returned by GET /api/me. */
export const meSchema = z.object({
  id: z.string().uuid(),
  nickname: z.string(),
  ageConfirmed: z.boolean(),
  isAdmin: z.boolean(),
});
export type Me = z.infer<typeof meSchema>;
