import { NextRequest } from "next/server";
import { dataService } from "@/lib/data-service";
import { jsonResponse, errorResponse } from "@/lib/http";
import { InsuranceQuerySchema } from "./schema";

export async function GET(request: NextRequest) {
  const parse = InsuranceQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parse.success) {
    return errorResponse("Invalid query", 400, { issues: parse.error.issues });
  }

  const { q, status, page = 1, pageSize = 50 } = parse.data;

  try {
    const result = await dataService.getInsuranceQuotes({
      search: q ?? undefined,
      filters: status ? { status } : undefined,
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
    return errorResponse("Unable to fetch insurance quotes", 500, { message: (error as Error).message });
  }
}
