import { z } from "zod";

export const VouchersQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

export type VouchersQuery = z.infer<typeof VouchersQuerySchema>;
