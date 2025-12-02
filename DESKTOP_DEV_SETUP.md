# Desktop App Development Setup Guide
## Quick Start for Developers

### Prerequisites

1. **macOS** (required for building macOS apps)
2. **Rust** 1.70+ (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
3. **Node.js** 22.12.0 (use Volta or nvm)
4. **pnpm** 9.12.3 (`npm install -g pnpm@9.12.3`)
5. **Xcode Command Line Tools** (`xcode-select --install`)

### Installation Steps

```bash
# 1. Clone and install dependencies
cd /path/to/prisma
pnpm install --frozen-lockfile

# 2. Set up environment variables
cp .env.desktop .env.local

# Edit .env.local with your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 3. Verify Rust installation
cargo --version
rustc --version

# 4. Install Tauri CLI (already in devDependencies)
# No action needed if pnpm install completed successfully
```

### Development Workflow

#### Start Development Server

```bash
# Terminal 1: Start Next.js dev server
pnpm --filter @prisma-glow/web dev

# Terminal 2: Start Tauri in another terminal
# (waits for Next.js to be ready on port 3000)
pnpm tauri:dev

# OR use single command (recommended):
pnpm desktop:dev
```

The desktop app will:
1. Open a window pointing to `http://localhost:3000`
2. Enable hot-reload for Next.js changes
3. Auto-reload on Rust code changes
4. Open DevTools in debug mode

#### Build for Production

```bash
# Build optimized desktop app
pnpm desktop:build

# Output: src-tauri/target/release/bundle/macos/Prisma Glow.app
# Output: src-tauri/target/release/bundle/dmg/Prisma Glow_1.0.0_universal.dmg
```

### Project Structure

```
prisma/
├── apps/web/                    # Next.js frontend (shared with web)
│   ├── app/
│   │   ├── desktop/            # Desktop-specific routes
│   │   │   ├── login/          # Desktop login page
│   │   │   ├── settings/       # Desktop settings
│   │   │   ├── layout.tsx      # Desktop layout wrapper
│   │   │   └── page.tsx        # Desktop entry (auto-redirects)
│   │   └── ...                 # Other app routes
│   ├── components/
│   │   ├── desktop/            # Desktop-specific components
│   │   │   ├── TitleBar.tsx    # Custom window controls
│   │   │   ├── SystemTrayMenu.tsx
│   │   │   └── DesktopFeatures.tsx
│   │   └── ui/                 # Shared UI components
│   ├── next.config.mjs         # Conditional export for Tauri
│   └── package.json
│
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── main.rs             # Entry point, Tauri commands
│   │   ├── config.rs           # Configuration management
│   │   ├── error.rs            # Error handling
│   │   ├── db_migrations.rs    # Database migrations
│   │   └── sync_commands.rs    # Sync logic
│   ├── migrations/             # SQL migrations
│   │   ├── 001_initial.sql
│   │   ├── 002_add_indexes.sql
│   │   └── 003_fts.sql
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
│
├── .env.desktop                # Environment template
└── package.json                # Root scripts
```

### Key Tauri Commands (Rust → TypeScript)

```typescript
import { invoke } from '@tauri-apps/api/core';

// Authentication
const [user, token] = await invoke('login', { email, password });
await invoke('logout');
const token = await invoke('get_stored_token');

// Database
await invoke('init_local_db');
const status = await invoke('get_sync_status');

// Sync
const result = await invoke('sync_all_data', { authToken: token.access_token });
const docs = await invoke('get_local_documents');
const dirty = await invoke('get_dirty_documents');
await invoke('mark_document_synced', { documentId: 'abc' });

// API Proxy
const data = await invoke('api_get', { endpoint: '/api/data', token: 'xxx' });
await invoke('api_post', { endpoint: '/api/data', body: {...}, token: 'xxx' });

// System
const version = await invoke('get_app_version'); // "1.0.0"
const platform = await invoke('get_platform'); // "macos"
```

### Database Schema (SQLite)

**Location**: `~/Library/Application Support/com.prismaglow.desktop/prisma.db`

**Tables**:
- `documents` - Synced documents with version tracking
- `users` - Cached user data
- `settings` - App preferences
- `cache` - API response cache
- `sync_queue` - Offline operation queue
- `sync_metadata` - Last sync timestamp and status
- `schema_version` - Migration tracking
- `documents_fts` - Full-text search index

**Migrations**: Automatically applied on `init_local_db()`

### Development Tips

1. **Hot Reload**: Next.js changes are instant. Rust changes require app restart.

2. **DevTools**: Auto-opens in debug mode. Access via:
   - Right-click → Inspect Element
   - Cmd+Option+I (macOS)

3. **Logs**:
   - Rust logs: Terminal running `tauri:dev`
   - Frontend logs: DevTools console
   - Database location: `~/Library/Application Support/com.prismaglow.desktop/`

4. **Reset Database**: Delete `prisma.db` from app data directory (migrations re-run on next launch)

5. **Environment Variables**: Must be set BEFORE running Tauri (Rust reads at startup)

### Troubleshooting

#### "Missing NEXT_PUBLIC_SUPABASE_URL"
- Ensure `.env.local` exists with valid values
- Restart Tauri dev server

#### "Port 3000 already in use"
- Kill existing Next.js process: `lsof -ti:3000 | xargs kill -9`

#### "Database locked"
- Close other instances of the app
- Delete `.db-wal` and `.db-shm` files

#### Build fails with "xcrun: error"
- Install Xcode Command Line Tools: `xcode-select --install`

#### App won't open (Gatekeeper)
- Development builds: `xattr -cr "Prisma Glow.app"`
- Production: Requires code signing and notarization

### Next Steps

1. **Phase 1** ✅: Foundation (build system, config, migrations)
2. **Phase 2**: Authentication flow, database schema
3. **Phase 3**: Sync engine, offline support
4. **Phase 4**: Desktop UX components
5. **Phase 5**: Code signing, notarization, release

### Resources

- [Tauri Docs](https://tauri.app/v1/guides/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [macOS Code Signing](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

### Scripts Reference

```bash
# Development
pnpm desktop:dev              # Start dev server + Tauri
pnpm --filter @prisma-glow/web dev  # Just Next.js
pnpm tauri:dev               # Just Tauri (requires Next.js running)

# Building
pnpm desktop:build           # Build production app
pnpm tauri:build:macos       # Build universal macOS binary

# Testing
cargo test                   # Rust unit tests
pnpm test                    # JavaScript tests

# Debugging
cargo check                  # Check Rust compilation
pnpm typecheck               # Check TypeScript
```

---

**Last Updated**: December 2, 2025
**Version**: 1.0.0
