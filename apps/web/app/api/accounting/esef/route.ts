import { NextRequest } from 'next/server';
import { handleModuleRequest } from '../../../../lib/accounting/api';
import { exportEsefPackage } from '../../../../lib/accounting/workflows';

export async function POST(request: NextRequest) {
  return handleModuleRequest(request, 'esef', exportEsefPackage);
}
