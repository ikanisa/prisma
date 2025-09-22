import { NextRequest } from "next/server";
import { dataService } from "@/lib/data-service";
import { jsonResponse, errorResponse } from "@/lib/http";
import { VouchersQuerySchema } from "./schema";

export async function GET(request: NextRequest) {
  const parse = VouchersQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parse.success) {
    return errorResponse("Invalid query", 400, { issues: parse.error.issues });
  }

  const { q, status, page = 1, pageSize = 100 } = parse.data;

  try {
    const result = await dataService.getVouchers({
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
    return errorResponse("Unable to fetch vouchers", 500, { message: (error as Error).message });
  }
}
