-- Google Drive ingestion tables to support connector state and manual change processing (P0)

CREATE TABLE IF NOT EXISTS public.gdrive_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  knowledge_source_id UUID REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  service_account_email TEXT NOT NULL,
  shared_drive_id TEXT,
  folder_id TEXT NOT NULL,
  start_page_token TEXT,
  cursor_page_token TEXT,
  last_sync_at TIMESTAMPTZ,
  last_backfill_at TIMESTAMPTZ,
  last_error TEXT,
  watch_channel_id TEXT,
  watch_resource_id TEXT,
  watch_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gdrive_connectors_org_folder_idx
  ON public.gdrive_connectors (org_id, folder_id);

ALTER TABLE public.gdrive_connectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gdrive_connectors_rw ON public.gdrive_connectors;
CREATE POLICY gdrive_connectors_rw ON public.gdrive_connectors
  FOR ALL USING (
    public.is_member_of(gdrive_connectors.org_id)
    AND public.has_min_role(gdrive_connectors.org_id, 'MANAGER'::public.role_level)
  )
  WITH CHECK (
    public.is_member_of(gdrive_connectors.org_id)
    AND public.has_min_role(gdrive_connectors.org_id, 'MANAGER'::public.role_level)
  );

CREATE TABLE IF NOT EXISTS public.gdrive_change_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES public.gdrive_connectors(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN ('ADD', 'UPDATE', 'DELETE')),
  raw_payload JSONB,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gdrive_change_queue_connector_idx
  ON public.gdrive_change_queue (connector_id, created_at);

ALTER TABLE public.gdrive_change_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gdrive_change_queue_rw ON public.gdrive_change_queue;
CREATE POLICY gdrive_change_queue_rw ON public.gdrive_change_queue
  FOR ALL USING (
    public.is_member_of(gdrive_change_queue.org_id)
    AND public.has_min_role(gdrive_change_queue.org_id, 'MANAGER'::public.role_level)
  )
  WITH CHECK (
    public.is_member_of(gdrive_change_queue.org_id)
    AND public.has_min_role(gdrive_change_queue.org_id, 'MANAGER'::public.role_level)
  );

CREATE TABLE IF NOT EXISTS public.gdrive_documents (
  file_id TEXT PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES public.gdrive_connectors(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  checksum TEXT,
  size_bytes BIGINT,
  mime_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gdrive_documents_org_idx
  ON public.gdrive_documents (org_id);

ALTER TABLE public.gdrive_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gdrive_documents_rw ON public.gdrive_documents;
CREATE POLICY gdrive_documents_rw ON public.gdrive_documents
  FOR ALL USING (
    public.is_member_of(gdrive_documents.org_id)
    AND public.has_min_role(gdrive_documents.org_id, 'MANAGER'::public.role_level)
  )
  WITH CHECK (
    public.is_member_of(gdrive_documents.org_id)
    AND public.has_min_role(gdrive_documents.org_id, 'MANAGER'::public.role_level)
  );

CREATE TABLE IF NOT EXISTS public.gdrive_file_metadata (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  metadata JSONB NOT NULL,
  allowlisted_domain BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (org_id, file_id)
);

CREATE INDEX IF NOT EXISTS gdrive_file_metadata_file_idx
  ON public.gdrive_file_metadata (file_id);

ALTER TABLE public.gdrive_file_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gdrive_file_metadata_rw ON public.gdrive_file_metadata;
CREATE POLICY gdrive_file_metadata_rw ON public.gdrive_file_metadata
  FOR ALL USING (
    public.is_member_of(gdrive_file_metadata.org_id)
    AND public.has_min_role(gdrive_file_metadata.org_id, 'MANAGER'::public.role_level)
  )
  WITH CHECK (
    public.is_member_of(gdrive_file_metadata.org_id)
    AND public.has_min_role(gdrive_file_metadata.org_id, 'MANAGER'::public.role_level)
  );
