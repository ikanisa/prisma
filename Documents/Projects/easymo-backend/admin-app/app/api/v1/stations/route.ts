import { NextRequest } from "next/server";
import { dataService } from "@/lib/data-service";
import { jsonResponse, errorResponse } from "@/lib/http";
import { StationsQuerySchema } from "./schema";

export async function GET(request: NextRequest) {
  const parse = StationsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parse.success) {
    return errorResponse("Invalid query", 400, { issues: parse.error.issues });
  }

  const { q, page = 1, pageSize = 100 } = parse.data;

  try {
    const result = await dataService.getStations({ search: q ?? undefined, page, pageSize });
    return jsonResponse({
      items: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      source: result.source,
    });
  } catch (error) {
    return errorResponse("Unable to fetch stations", 500, { message: (error as Error).message });
  }
}
