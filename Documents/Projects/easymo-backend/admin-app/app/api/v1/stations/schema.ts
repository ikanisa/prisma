import { z } from "zod";

export const StationsQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

export type StationsQuery = z.infer<typeof StationsQuerySchema>;
