// Integration tests for Tauri desktop app
use rusqlite::Connection;

#[test]
fn test_basic() {
    assert_eq!(1 + 1, 2);
}

#[test]
fn test_sqlite_connection() {
    let conn = Connection::open_in_memory().unwrap();
    
    conn.execute(
        "CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
        [],
    )
    .unwrap();
    
    conn.execute("INSERT INTO test (name) VALUES (?1)", ["test_name"])
        .unwrap();
    
    let mut stmt = conn.prepare("SELECT name FROM test").unwrap();
    let name: String = stmt.query_row([], |row| row.get(0)).unwrap();
    
    assert_eq!(name, "test_name");
}

#[test]
fn test_sqlite_transaction() {
    let conn = Connection::open_in_memory().unwrap();
    
    conn.execute(
        "CREATE TABLE sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )
    .unwrap();
    
    let tx = conn.unchecked_transaction().unwrap();
    
    tx.execute(
        "INSERT INTO sync_queue (data, created_at) VALUES (?1, ?2)",
        ["test_data", "2024-01-01T00:00:00Z"],
    )
    .unwrap();
    
    tx.commit().unwrap();
    
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM sync_queue", [], |row| row.get(0))
        .unwrap();
    
    assert_eq!(count, 1);
}

#[test]
fn test_offline_data_schema() {
    let conn = Connection::open_in_memory().unwrap();
    
    // Create offline data schema
    conn.execute_batch(
        "
        CREATE TABLE documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            synced INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            synced INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL
        );
        
        CREATE INDEX idx_documents_synced ON documents(synced);
        CREATE INDEX idx_clients_synced ON clients(synced);
        ",
    )
    .unwrap();
    
    // Insert test document
    conn.execute(
        "INSERT INTO documents (id, title, updated_at) VALUES (?1, ?2, ?3)",
        ["doc-1", "Test Document", "2024-01-01T00:00:00Z"],
    )
    .unwrap();
    
    // Verify insertion
    let title: String = conn
        .query_row("SELECT title FROM documents WHERE id = ?1", ["doc-1"], |row| {
            row.get(0)
        })
        .unwrap();
    
    assert_eq!(title, "Test Document");
}

#[test]
fn test_conflict_resolution() {
    let conn = Connection::open_in_memory().unwrap();
    
    conn.execute_batch(
        "
        CREATE TABLE conflicts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            local_data TEXT NOT NULL,
            remote_data TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        ",
    )
    .unwrap();
    
    conn.execute(
        "INSERT INTO conflicts (entity_type, entity_id, local_data, remote_data, created_at) 
         VALUES (?1, ?2, ?3, ?4, ?5)",
        [
            "document",
            "doc-1",
            r#"{"title":"Local Title"}"#,
            r#"{"title":"Remote Title"}"#,
            "2024-01-01T00:00:00Z",
        ],
    )
    .unwrap();
    
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM conflicts", [], |row| row.get(0))
        .unwrap();
    
    assert_eq!(count, 1);
}
