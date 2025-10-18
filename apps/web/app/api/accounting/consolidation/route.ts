import { NextRequest } from 'next/server';
import { handleModuleRequest } from '@/lib/accounting/api';
import { runConsolidation } from '@/lib/accounting/workflows';

export async function POST(request: NextRequest) {
  return handleModuleRequest(request, 'consolidation', runConsolidation);
}
