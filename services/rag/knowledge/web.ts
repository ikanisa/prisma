import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseServiceRoleKey } from '@prisma-glow/lib/secrets';

let cachedClient: SupabaseClient | null = null;

async function getSupabase(): Promise<SupabaseClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL ?? '';
  if (!url) {
    throw new Error('SUPABASE_URL must be configured for web ingestion.');
  }

  const serviceRoleKey = await getSupabaseServiceRoleKey();
  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}

export interface WebSourceRow {
  id: string;
  title: string;
  url: string;
  domain: string | null;
  jurisdiction: string[];
  tags: string[];
}

export async function listWebSources(): Promise<WebSourceRow[]> {
  const supabase = await getSupabase();
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
  const supabase = await getSupabase();
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
