import { z } from "zod";

export const UsersQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

export type UsersQuery = z.infer<typeof UsersQuerySchema>;
