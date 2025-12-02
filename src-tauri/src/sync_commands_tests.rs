#[cfg(test)]
mod sync_tests {
    use super::*;

    #[test]
    fn test_document_serialization() {
        let doc = Document {
            id: "doc1".to_string(),
            title: "Test Doc".to_string(),
            content: Some("Content".to_string()),
            user_id: "user1".to_string(),
            created_at: 1234567890,
            updated_at: 1234567890,
            synced_at: 0,
            is_dirty: true,
        };

        let json = serde_json::to_string(&doc).unwrap();
        assert!(json.contains("Test Doc"));
        
        let deserialized: Document = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, "doc1");
        assert!(deserialized.is_dirty);
    }

    #[test]
    fn test_sync_result_creation() {
        let result = SyncResult {
            downloaded: 5,
            uploaded: 3,
            conflicts: 0,
            errors: vec![],
        };

        assert_eq!(result.downloaded, 5);
        assert_eq!(result.uploaded, 3);
        assert_eq!(result.conflicts, 0);
        assert!(result.errors.is_empty());
    }

    #[test]
    fn test_sync_result_with_errors() {
        let result = SyncResult {
            downloaded: 0,
            uploaded: 0,
            conflicts: 2,
            errors: vec!["Error 1".to_string(), "Error 2".to_string()],
        };

        assert_eq!(result.conflicts, 2);
        assert_eq!(result.errors.len(), 2);
    }
}
