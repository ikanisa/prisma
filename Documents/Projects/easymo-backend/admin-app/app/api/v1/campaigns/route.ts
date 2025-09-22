import { NextRequest } from "next/server";
import { dataService } from "@/lib/data-service";
import { jsonResponse, errorResponse } from "@/lib/http";
import { CampaignsQuerySchema } from "./schema";

export async function GET(request: NextRequest) {
  const parse = CampaignsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parse.success) {
    return errorResponse("Invalid query", 400, { issues: parse.error.issues });
  }

  const { q, status, type, page = 1, pageSize = 50 } = parse.data;

  try {
    const result = await dataService.getCampaigns({
      search: q ?? undefined,
      filters: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      },
      page,
      pageSize,
    });

    return jsonResponse({
      items: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      source: result.source,
    });
  } catch (error) {
    return errorResponse("Unable to fetch campaigns", 500, { message: (error as Error).message });
  }
}
