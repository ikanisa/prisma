// Configuration management for Desktop App
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AppConfig {
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub api_base_url: String,
    pub sync_interval_seconds: u64,
    pub max_offline_queue_size: usize,
    pub retry_attempts: u32,
}

static CONFIG: OnceLock<AppConfig> = OnceLock::new();

/// Initialize app configuration from environment variables
pub fn init_config() -> Result<(), String> {
    let config = AppConfig {
        supabase_url: std::env::var("NEXT_PUBLIC_SUPABASE_URL")
            .map_err(|_| "Missing required env var: NEXT_PUBLIC_SUPABASE_URL".to_string())?,
        supabase_anon_key: std::env::var("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            .map_err(|_| "Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY".to_string())?,
        api_base_url: std::env::var("NEXT_PUBLIC_API_URL")
            .unwrap_or_else(|_| "https://api.prisma-glow.com".to_string()),
        sync_interval_seconds: std::env::var("SYNC_INTERVAL_SECONDS")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(300), // Default: 5 minutes
        max_offline_queue_size: 1000,
        retry_attempts: 3,
    };
    
    CONFIG.set(config).map_err(|_| "Config already initialized".to_string())?;
    println!("✅ Configuration initialized");
    Ok(())
}

/// Get the global configuration
pub fn get_config() -> &'static AppConfig {
    CONFIG.get().expect("Config not initialized. Call init_config() first.")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_validation() {
        std::env::set_var("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
        std::env::set_var("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
        
        let result = init_config();
        assert!(result.is_ok());
        
        let config = get_config();
        assert_eq!(config.supabase_url, "https://test.supabase.co");
        assert_eq!(config.sync_interval_seconds, 300);
    }
}
