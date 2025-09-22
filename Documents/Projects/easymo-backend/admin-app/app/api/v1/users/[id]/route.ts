import { NextRequest } from "next/server";
import { dataService } from "@/lib/data-service";
import { jsonResponse, errorResponse } from "@/lib/http";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const userId = context.params?.id;
  if (!userId) {
    return errorResponse("Missing user id", 400);
  }

  try {
    const [userResult, vouchersResult, quotesResult] = await Promise.all([
      dataService.getUsers({ filters: { id: userId }, pageSize: 1 }),
      dataService.getVouchers({ filters: { user_id: userId }, pageSize: 100 }),
      dataService.getInsuranceQuotes({ filters: { user_id: userId }, pageSize: 100 }),
    ]);

    const user = userResult.data[0];
    if (!user) {
      return errorResponse("User not found", 404);
    }

    return jsonResponse({
      user,
      vouchers: vouchersResult.data,
      quotes: quotesResult.data,
      source: {
        user: userResult.source,
        vouchers: vouchersResult.source,
        quotes: quotesResult.source,
      },
    });
  } catch (error) {
    return errorResponse("Unable to fetch user detail", 500, { message: (error as Error).message });
  }
}
