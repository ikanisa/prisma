-- Add full-text search support
-- Version: 3
-- Created: 2025-12-02

-- Full-text search virtual table for documents
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    title, 
    content,
    content=documents,
    content_rowid=rowid
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, content)
  VALUES (new.rowid, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  DELETE FROM documents_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  UPDATE documents_fts 
  SET title = new.title, content = new.content
  WHERE rowid = new.rowid;
END;

-- Update schema version
INSERT OR REPLACE INTO schema_version (version, applied_at) 
VALUES (3, strftime('%s', 'now'));
