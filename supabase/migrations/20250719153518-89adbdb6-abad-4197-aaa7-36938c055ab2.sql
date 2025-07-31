-- Learning Module Ingestion System Schema

-- ① Master record for learning modules
CREATE TABLE IF NOT EXISTS learning_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT,
  source_type     TEXT CHECK (source_type IN ('pdf','docx','url','txt')),
  source_path     TEXT,                  -- storage path OR url
  agent_scope     TEXT DEFAULT 'MarketingAgent',  -- pipe-separated list later
  status          TEXT DEFAULT 'uploaded',        -- uploaded|processing|needs_review|approved|failed
  summary         TEXT,
  content         TEXT,                             -- full cleaned text ≤ 1 MB
  auto_tags       TEXT[],
  relevance_score NUMERIC DEFAULT 0.5,
  vector_ns       TEXT,                             -- Pinecone namespace
  vector_count    INTEGER DEFAULT 0,
  uploaded_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ② Per-step pipeline tracker
CREATE TABLE IF NOT EXISTS ingestion_pipeline (
  id            BIGSERIAL PRIMARY KEY,
  module_id     UUID REFERENCES learning_modules(id) ON DELETE CASCADE,
  stage         TEXT,                           -- upload|extract|summary|tag|embed
  status        TEXT DEFAULT 'pending',
  log           TEXT,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ingest_module_idx ON ingestion_pipeline(module_id);
CREATE INDEX IF NOT EXISTS ingest_status_idx ON ingestion_pipeline(status);

-- ③ Manual QA queue
CREATE TABLE IF NOT EXISTS module_reviews (
  id           BIGSERIAL PRIMARY KEY,
  module_id    UUID REFERENCES learning_modules(id) ON DELETE CASCADE,
  reviewer_id  UUID REFERENCES auth.users(id),
  decision     TEXT,          -- approved|rejected|needs_fix
  notes        TEXT,
  decided_at   TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin read learning_modules" ON learning_modules
  FOR SELECT USING (is_admin());

CREATE POLICY "Admin manage learning_modules" ON learning_modules
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System manage learning_modules" ON learning_modules
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin read ingestion_pipeline" ON ingestion_pipeline
  FOR SELECT USING (is_admin());

CREATE POLICY "System manage ingestion_pipeline" ON ingestion_pipeline
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin manage module_reviews" ON module_reviews
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Storage bucket for learning uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('learning_uploads', 'learning_uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admin access learning uploads" ON storage.objects
  FOR ALL USING (bucket_id = 'learning_uploads' AND is_admin())
  WITH CHECK (bucket_id = 'learning_uploads' AND is_admin());

CREATE POLICY "System access learning uploads" ON storage.objects
  FOR ALL USING (bucket_id = 'learning_uploads')
  WITH CHECK (bucket_id = 'learning_uploads');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS learning_modules_status_idx ON learning_modules(status);
CREATE INDEX IF NOT EXISTS learning_modules_agent_scope_idx ON learning_modules(agent_scope);
CREATE INDEX IF NOT EXISTS learning_modules_created_at_idx ON learning_modules(created_at);

-- Update trigger for learning_modules
CREATE OR REPLACE FUNCTION update_learning_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_learning_modules_updated_at
  BEFORE UPDATE ON learning_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_modules_updated_at();