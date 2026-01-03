# Desktop App - Technical Specification & Architecture

**Version:** 1.0.0  
**Last Updated:** 2025-12-02  
**Status:** Draft - Not Implemented

---

## ARCHITECTURE OVERVIEW

### Current State
```
┌─────────────────────────────────────────────────────┐
│  Desktop App (2 implementations - CONFLICTING)      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  desktop-app/                    src-tauri/         │
│  ├── src-tauri/                 ├── Cargo.toml      │
│  │   ├── Cargo.toml (v2.0)     │   (Tauri v1.6)    │
│  │   ├── tauri.conf.json       ├── tauri.conf.json │
│  │   └── src/main.rs (73L)     └── src/            │
│  │                               │   ├── main.rs (99L) │
│  ├── index.html (standalone)   │   └── commands/   │
│  └── package.json              │       ├── database.rs │
│                                 │       ├── file_system.rs │
│                                 │       ├── updater.rs │
│                                 │       └── window.rs │
│                                                     │
└─────────────────────────────────────────────────────┘
            ❌ NOT CONNECTED TO MAIN APP
```

### Target State
```
┌──────────────────────────────────────────────────────────────────┐
│                     Desktop Application (Tauri v2)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────┐          ┌─────────────────────────┐     │
│  │   Rust Backend    │◄────────►│   React Frontend         │     │
│  │   (Tauri Core)    │  IPC     │   (Next.js SSG)          │     │
│  │                   │          │                          │     │
│  │ • Commands        │          │ • Components             │     │
│  │ • Plugins         │          │ • Hooks (useTauri)       │     │
│  │ • State Mgmt      │          │ • Routing                │     │
│  │ • DB (SQLite)     │          │ • Offline UI             │     │
│  └────────┬──────────┘          └────────┬─────────────────┘     │
│           │                              │                        │
│           └──────────┬───────────────────┘                        │
│                      │                                            │
└──────────────────────┼────────────────────────────────────────────┘
                       │
         ┌─────────────┴───────────────┐
         │                             │
    ┌────▼─────┐                  ┌───▼────────┐
    │ FastAPI  │                  │ Supabase   │
    │ Backend  │                  │ PostgreSQL │
    │ (HTTP)   │                  │ (HTTP/WS)  │
    └──────────┘                  └────────────┘
```

---

## TECHNOLOGY STACK

### Frontend
- **Framework:** Next.js 14.2.18 (SSG mode)
- **Language:** TypeScript 5.7
- **UI Library:** React 18.3
- **Styling:** Tailwind CSS 3.4
- **State:** React Query + Zustand
- **Offline:** IndexedDB + Service Worker (fallback)

### Backend (Rust)
- **Framework:** Tauri 2.0
- **Language:** Rust 1.91.1 (edition 2021)
- **Database:** SQLite 3.x with SQLCipher
- **HTTP Client:** reqwest 0.11
- **Serialization:** serde + serde_json 1.0
- **Async Runtime:** tokio 1.x

### Infrastructure
- **Build Tool:** pnpm 9.12.3
- **Bundler:** Vite 5.x
- **CI/CD:** GitHub Actions
- **Distribution:** GitHub Releases + App Store
- **Update Server:** GitHub Releases API

---

## DETAILED COMPONENT SPECIFICATIONS

### 1. Tauri Configuration

**File:** `desktop-app/src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://schema.tauri.app/config/2.0",
  "productName": "Prisma Glow",
  "version": "1.0.0",
  "identifier": "com.prismaglow.desktop",
  
  "build": {
    "beforeDevCommand": "cd ../../apps/web && pnpm dev",
    "beforeBuildCommand": "cd ../../apps/web && pnpm build",
    "devPath": "http://localhost:3000",
    "distDir": "../../apps/web/out"
  },
  
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Prisma Glow",
        "width": 1400,
        "height": 900,
        "minWidth": 1000,
        "minHeight": 700,
        "resizable": true,
        "fullscreen": false,
        "decorations": false,
        "transparent": true,
        "center": true,
        "url": "index.html"
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.prisma-glow.com https://*.supabase.co wss://*.supabase.co; img-src 'self' data: https:; font-src 'self' data:;"
    }
  },
  
  "bundle": {
    "active": true,
    "category": "Productivity",
    "copyright": "© 2025 Prisma Glow",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "identifier": "com.prismaglow.desktop",
    "longDescription": "AI-powered operations platform for modern teams",
    "shortDescription": "Prisma Glow Desktop",
    "targets": ["dmg", "app"],
    "macOS": {
      "minimumSystemVersion": "11.0",
      "entitlements": "entitlements.plist",
      "providerShortName": "PrismaGlow",
      "signingIdentity": "-"
    }
  },
  
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://api.github.com/repos/prisma-glow/desktop/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "REPLACE_WITH_UPDATER_PUBKEY"
    }
  }
}
```

---

### 2. Rust Backend Architecture

**File:** `desktop-app/src-tauri/Cargo.toml`

```toml
[package]
name = "prisma-glow-desktop"
version = "1.0.0"
edition = "2021"
rust-version = "1.91"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.0", features = ["macos-private-api", "unstable"] }
tauri-plugin-shell = "2.0"
tauri-plugin-dialog = "2.0"
tauri-plugin-fs = "2.0"
tauri-plugin-notification = "2.0"
tauri-plugin-window-state = "2.0"
tauri-plugin-updater = "2.0"

# HTTP & API
reqwest = { version = "0.11", features = ["json", "rustls-tls"] }
postgrest = "1.0"

# Database
rusqlite = { version = "0.31", features = ["bundled-sqlcipher"] }
diesel = { version = "2.1", features = ["sqlite", "r2d2"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Async
tokio = { version = "1", features = ["full"] }

# Security
keyring = "2.0"
ring = "0.17"

# Utilities
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.0", features = ["v4", "serde"] }
thiserror = "1.0"
anyhow = "1.0"

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"

# Monitoring
sentry = "0.32"
sentry-tauri = "0.32"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

---

### 3. Command Structure

**File:** `desktop-app/src-tauri/src/commands/mod.rs`

```rust
pub mod auth;
pub mod database;
pub mod file_system;
pub mod sync;
pub mod api;
pub mod updater;
pub mod window;

// Export all commands
pub use auth::*;
pub use database::*;
pub use file_system::*;
pub use sync::*;
pub use api::*;
pub use updater::*;
pub use window::*;
```

**File:** `desktop-app/src-tauri/src/commands/auth.rs`

```rust
use keyring::Entry;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthToken {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
}

/// Login with email and password
#[tauri::command]
pub async fn login(
    email: String,
    password: String,
) -> Result<(User, AuthToken), String> {
    // Call Supabase auth API
    let client = reqwest::Client::new();
    let response = client
        .post("https://xxx.supabase.co/auth/v1/token?grant_type=password")
        .json(&serde_json::json!({
            "email": email,
            "password": password
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err("Invalid credentials".to_string());
    }

    let auth: AuthToken = response.json().await.map_err(|e| e.to_string())?;
    
    // Store in macOS Keychain
    let entry = Entry::new("com.prismaglow.desktop", "auth_token")
        .map_err(|e| e.to_string())?;
    entry
        .set_password(&serde_json::to_string(&auth).unwrap())
        .map_err(|e| e.to_string())?;

    // Fetch user profile
    let user = fetch_user_profile(&auth.access_token).await?;
    
    Ok((user, auth))
}

/// Logout and clear stored credentials
#[tauri::command]
pub async fn logout() -> Result<(), String> {
    let entry = Entry::new("com.prismaglow.desktop", "auth_token")
        .map_err(|e| e.to_string())?;
    entry.delete_password().map_err(|e| e.to_string())?;
    Ok(())
}

/// Get stored auth token
#[tauri::command]
pub async fn get_auth_token() -> Result<Option<AuthToken>, String> {
    let entry = Entry::new("com.prismaglow.desktop", "auth_token")
        .map_err(|e| e.to_string())?;
    
    match entry.get_password() {
        Ok(token_str) => {
            let token: AuthToken = serde_json::from_str(&token_str)
                .map_err(|e| e.to_string())?;
            Ok(Some(token))
        }
        Err(_) => Ok(None),
    }
}

async fn fetch_user_profile(token: &str) -> Result<User, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://xxx.supabase.co/auth/v1/user")
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    response.json().await.map_err(|e| e.to_string())
}
```

**File:** `desktop-app/src-tauri/src/commands/api.rs`

```rust
use reqwest::Client;
use serde_json::Value;
use tauri::State;

pub struct ApiClient {
    client: Client,
    base_url: String,
}

impl ApiClient {
    pub fn new(base_url: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
        }
    }
}

#[tauri::command]
pub async fn api_get(
    endpoint: String,
    token: String,
    state: State<'_, ApiClient>,
) -> Result<Value, String> {
    let url = format!("{}/{}", state.base_url, endpoint);
    
    let response = state
        .client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    response.json().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn api_post(
    endpoint: String,
    body: Value,
    token: String,
    state: State<'_, ApiClient>,
) -> Result<Value, String> {
    let url = format!("{}/{}", state.base_url, endpoint);
    
    let response = state
        .client
        .post(&url)
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    response.json().await.map_err(|e| e.to_string())
}
```

---

### 4. Frontend Integration

**File:** `apps/web/lib/desktop/tauri-adapter.ts`

```typescript
import { invoke } from '@tauri-apps/api/tauri';

export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export const desktopAuth = {
  login: async (email: string, password: string): Promise<{ user: User; token: AuthToken }> => {
    if (!isTauri()) throw new Error('Not in Tauri environment');
    return await invoke('login', { email, password });
  },

  logout: async (): Promise<void> => {
    if (!isTauri()) throw new Error('Not in Tauri environment');
    return await invoke('logout');
  },

  getToken: async (): Promise<AuthToken | null> => {
    if (!isTauri()) return null;
    return await invoke('get_auth_token');
  },
};

export const desktopApi = {
  get: async <T = any>(endpoint: string, token: string): Promise<T> => {
    if (!isTauri()) throw new Error('Not in Tauri environment');
    return await invoke('api_get', { endpoint, token });
  },

  post: async <T = any>(endpoint: string, body: any, token: string): Promise<T> => {
    if (!isTauri()) throw new Error('Not in Tauri environment');
    return await invoke('api_post', { endpoint, body, token });
  },
};
```

**File:** `apps/web/app/layout.tsx` (Desktop-aware)

```typescript
import { isTauri } from '@/lib/desktop/tauri-adapter';
import { TitleBar } from '@/components/desktop/TitleBar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isDesktop = isTauri();

  return (
    <html lang="en">
      <body>
        {isDesktop && <TitleBar />}
        <div className={isDesktop ? 'desktop-content' : undefined}>
          {children}
        </div>
      </body>
    </html>
  );
}
```

---

### 5. Database Schema (SQLite)

**File:** `desktop-app/src-tauri/migrations/001_initial.sql`

```sql
-- Users cache
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    synced_at INTEGER NOT NULL,
    is_dirty INTEGER DEFAULT 0
);

-- Documents cache
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    doc_type TEXT NOT NULL,
    user_id TEXT REFERENCES users(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER NOT NULL,
    is_dirty INTEGER DEFAULT 0
);

-- Tasks cache
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    due_date TEXT,
    user_id TEXT REFERENCES users(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    synced_at INTEGER NOT NULL,
    is_dirty INTEGER DEFAULT 0
);

-- Sync metadata
CREATE TABLE sync_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_sync_at INTEGER,
    last_sync_status TEXT,
    conflicts_count INTEGER DEFAULT 0
);

INSERT INTO sync_metadata (id, last_sync_at, last_sync_status) 
VALUES (1, 0, 'never');

-- Offline queue (operations to sync)
CREATE TABLE offline_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,  -- 'document', 'task', etc.
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,    -- 'create', 'update', 'delete'
    payload TEXT,               -- JSON
    created_at INTEGER NOT NULL,
    attempts INTEGER DEFAULT 0,
    last_error TEXT
);

-- Create indices
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_dirty ON documents(is_dirty) WHERE is_dirty = 1;
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_dirty ON tasks(is_dirty) WHERE is_dirty = 1;
CREATE INDEX idx_queue_pending ON offline_queue(created_at) WHERE attempts < 3;
```

---

### 6. CI/CD Pipeline

**File:** `.github/workflows/desktop-release.yml`

```yaml
name: Release Desktop App

on:
  push:
    tags:
      - 'desktop-v*'
  workflow_dispatch:

jobs:
  create-release:
    runs-on: ubuntu-latest
    outputs:
      upload_url: ${{ steps.create_release.outputs.upload_url }}
      version: ${{ steps.version.outputs.version }}
    steps:
      - name: Get version
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/desktop-v}" >> $GITHUB_OUTPUT

      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Prisma Glow Desktop ${{ steps.version.outputs.version }}
          draft: true
          prerelease: false

  build-macos:
    needs: create-release
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup
        uses: ./.github/actions/setup-tauri
      
      - name: Import Certificate
        env:
          CERTIFICATE_BASE64: ${{ secrets.MACOS_CERT_P12 }}
          CERTIFICATE_PASSWORD: ${{ secrets.MACOS_CERT_PASSWORD }}
        run: |
          # ... (certificate import logic)
      
      - name: Build
        run: |
          cd desktop-app
          pnpm tauri build
      
      - name: Notarize
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          xcrun notarytool submit \
            desktop-app/src-tauri/target/release/bundle/dmg/*.dmg \
            --apple-id "$APPLE_ID" \
            --password "$APPLE_PASSWORD" \
            --team-id "$APPLE_TEAM_ID" \
            --wait
          
          xcrun stapler staple \
            desktop-app/src-tauri/target/release/bundle/dmg/*.dmg
      
      - name: Upload to Release
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ needs.create-release.outputs.upload_url }}
          asset_path: desktop-app/src-tauri/target/release/bundle/dmg/Prisma-Glow.dmg
          asset_name: Prisma-Glow-macOS-${{ needs.create-release.outputs.version }}.dmg
          asset_content_type: application/octet-stream

  build-windows:
    # Similar structure for Windows

  build-linux:
    # Similar structure for Linux
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Weeks 1-4)
- [ ] Consolidate Tauri implementations (choose v2)
- [ ] Generate app icons
- [ ] Configure Next.js SSG export
- [ ] Set up local SQLite database
- [ ] Implement authentication (Keychain storage)
- [ ] Build API client wrapper
- [ ] Test end-to-end: login → fetch data → display

### Phase 2: Features (Weeks 5-8)
- [ ] Offline sync engine
- [ ] Conflict resolution UI
- [ ] Background sync scheduler
- [ ] System notifications
- [ ] Keyboard shortcuts
- [ ] File associations
- [ ] Custom title bar
- [ ] System tray menu

### Phase 3: Production (Weeks 9-12)
- [ ] Purchase Apple Developer cert
- [ ] Configure notarization
- [ ] Set up update server
- [ ] Implement auto-update
- [ ] Add Sentry crash reporting
- [ ] Add analytics
- [ ] Write comprehensive tests
- [ ] Beta testing (internal + external)

### Phase 4: Launch (Weeks 13-14)
- [ ] Final security audit
- [ ] Performance optimization
- [ ] Create user documentation
- [ ] Submit to App Store (optional)
- [ ] Public release v1.0.0

---

**Document Owner:** Engineering Team  
**Review Cadence:** Weekly during active development  
**Status:** Living document - update as implementation progresses
