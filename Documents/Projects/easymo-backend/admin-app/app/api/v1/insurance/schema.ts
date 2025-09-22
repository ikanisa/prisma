import { z } from "zod";

export const InsuranceQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

export type InsuranceQuery = z.infer<typeof InsuranceQuerySchema>;
