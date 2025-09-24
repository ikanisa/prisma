import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for web ingestion.');
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export interface WebSourceRow {
  id: string;
  title: string;
  url: string;
  domain: string | null;
  jurisdiction: string[];
  tags: string[];
}

export async function listWebSources(): Promise<WebSourceRow[]> {
  const { data, error } = await supabase
    .from('web_knowledge_sources')
    .select('id, title, url, domain, jurisdiction, tags')
    .order('priority', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getWebSource(webSourceId: string): Promise<WebSourceRow> {
  const { data, error } = await supabase
    .from('web_knowledge_sources')
    .select('id, title, url, domain, jurisdiction, tags')
    .eq('id', webSourceId)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error('web_source_not_found');
  }
  return data as WebSourceRow;
}
