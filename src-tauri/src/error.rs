// Enhanced error handling for Desktop App
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppError {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

impl AppError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            details: None,
        }
    }

    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }

    pub fn to_string(&self) -> String {
        if let Some(details) = &self.details {
            format!("[{}] {}: {}", self.code, self.message, details)
        } else {
            format!("[{}] {}", self.code, self.message)
        }
    }
}

// Conversion from common error types
impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::new("DB_ERROR", "Database operation failed")
            .with_details(err.to_string())
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::new("NETWORK_ERROR", "Network request failed")
            .with_details(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::new("PARSE_ERROR", "JSON parsing failed")
            .with_details(err.to_string())
    }
}

impl From<String> for AppError {
    fn from(msg: String) -> Self {
        AppError::new("APP_ERROR", msg)
    }
}

impl From<&str> for AppError {
    fn from(msg: &str) -> Self {
        AppError::new("APP_ERROR", msg)
    }
}

pub type AppResult<T> = Result<T, AppError>;
