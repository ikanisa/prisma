// Database migration system
use rusqlite::Connection;

const MIGRATIONS: &[(i32, &str)] = &[
    (1, include_str!("../migrations/001_initial.sql")),
    (2, include_str!("../migrations/002_add_indexes.sql")),
    (3, include_str!("../migrations/003_fts.sql")),
];

/// Get current schema version from database
fn get_schema_version(conn: &Connection) -> Result<i32, rusqlite::Error> {
    // Check if schema_version table exists
    let table_exists: bool = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='schema_version'",
        [],
        |row| row.get(0),
    )?;
    
    if !table_exists {
        return Ok(0);
    }
    
    // Get latest version
    let version: Result<i32, _> = conn.query_row(
        "SELECT MAX(version) FROM schema_version",
        [],
        |row| row.get(0),
    );
    
    Ok(version.unwrap_or(0))
}

/// Run all pending migrations
pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    let current_version = get_schema_version(conn).map_err(|e| e.to_string())?;
    
    println!("📊 Current schema version: {}", current_version);
    println!("🔄 Running migrations...");
    
    let mut applied = 0;
    for (version, sql) in MIGRATIONS {
        if *version > current_version {
            println!("  ⏫ Applying migration {} ...", version);
            conn.execute_batch(sql).map_err(|e| {
                format!("Migration {} failed: {}", version, e)
            })?;
            applied += 1;
        }
    }
    
    if applied > 0 {
        println!("✅ Applied {} migrations", applied);
    } else {
        println!("✅ Database is up to date");
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_migrations() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        
        // Verify tables exist
        let table_count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table'",
            [],
            |row| row.get(0),
        ).unwrap();
        
        assert!(table_count >= 7); // documents, users, settings, cache, sync_queue, sync_metadata, schema_version
        
        // Verify schema version
        let version: i32 = conn.query_row(
            "SELECT MAX(version) FROM schema_version",
            [],
            |row| row.get(0),
        ).unwrap();
        
        assert_eq!(version, 3);
    }

    #[test]
    fn test_idempotent_migrations() {
        let conn = Connection::open_in_memory().unwrap();
        
        // Run migrations twice
        run_migrations(&conn).unwrap();
        run_migrations(&conn).unwrap();
        
        // Should still have version 3
        let version: i32 = conn.query_row(
            "SELECT MAX(version) FROM schema_version",
            [],
            |row| row.get(0),
        ).unwrap();
        
        assert_eq!(version, 3);
    }
}
