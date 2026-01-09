export type CheckResult = {
  status: 'ok' | 'error';
  detail?: string;
};

export type ReadinessSummary = {
  status: 'ok' | 'degraded';
  checks: Record<string, CheckResult>;
};

const MAX_DETAIL_LENGTH = 200;

function serialiseError(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value.length > MAX_DETAIL_LENGTH ? `${value.slice(0, MAX_DETAIL_LENGTH - 3)}...` : value;
}

export async function checkDatabase(client: { query: (sql: string) => Promise<unknown> }): Promise<CheckResult> {
  try {
    await client.query('SELECT 1');
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', detail: serialiseError(error) };
  }
}

export function checkEnvironment(variableName: string, value: string | undefined | null): CheckResult {
  if (value && value.trim().length > 0) {
    return { status: 'ok' };
  }
  return { status: 'error', detail: `${variableName} is not configured` };
}

export async function buildReadinessSummary(options: {
  db: { query: (sql: string) => Promise<unknown> };
  supabaseUrl: string | undefined;
  supabaseServiceRoleKey: string;
  openAIApiKey: string | undefined;
}): Promise<ReadinessSummary> {
  const checks: Record<string, CheckResult> = {
    database: await checkDatabase(options.db),
    supabaseUrl: checkEnvironment('SUPABASE_URL', options.supabaseUrl),
    supabaseServiceRoleKey: checkEnvironment('SUPABASE_SERVICE_ROLE_KEY', options.supabaseServiceRoleKey),
    openaiApiKey: checkEnvironment('OPENAI_API_KEY', options.openAIApiKey),
  };

  const status = Object.values(checks).every((check) => check.status === 'ok') ? 'ok' : 'degraded';
  return { status, checks };
}
