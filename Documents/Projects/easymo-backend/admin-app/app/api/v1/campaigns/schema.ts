import { z } from "zod";

export const CampaignsQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

export type CampaignsQuery = z.infer<typeof CampaignsQuerySchema>;
