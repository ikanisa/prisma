-- Adds a unique constraint to ensure each knowledge_web_sources row has a unique URL.
-- First, remove duplicates (keeping the most recently updated one)

-- Step 1: Delete duplicate URLs, keeping the one with the most recent updated_at
DELETE FROM knowledge_web_sources a
USING knowledge_web_sources b
WHERE a.url = b.url
  AND a.id < b.id;  -- Keep the row with the larger (newer) ID

-- Step 2: Add the unique constraint
ALTER TABLE knowledge_web_sources
  ADD CONSTRAINT knowledge_web_sources_url_key UNIQUE (url);
