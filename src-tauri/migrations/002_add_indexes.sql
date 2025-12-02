-- Add indexes for performance
-- Version: 2
-- Created: 2025-12-02

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_updated ON documents(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_dirty ON documents(is_dirty) WHERE is_dirty = 1;
CREATE INDEX IF NOT EXISTS idx_documents_synced ON documents(synced_at);

-- Sync queue indexes
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);

-- Cache index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);

-- Update schema version
INSERT OR REPLACE INTO schema_version (version, applied_at) 
VALUES (2, strftime('%s', 'now'));
