# Knowledge Factory Setup Guide

## Prerequisites

- Node.js v22.12+
- pnpm v9+
- Supabase project with pgvector extension
- Google Cloud project with Drive API enabled
- OpenAI API key
- Gemini API key

---

## Step 1: Google Drive Service Account

### 1.1 Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **IAM & Admin > Service Accounts**
4. Click **Create Service Account**
   - Name: `prisma-glow-drive-ingestion`
   - Role: None (will use Drive sharing)
5. Create JSON key and download

### 1.2 Enable APIs

```bash
gcloud services enable drive.googleapis.com
gcloud services enable documentai.googleapis.com  # Optional for OCR
```

### 1.3 Share Drive Folder

1. Open Google Drive
2. Right-click folder → **Share**
3. Add service account email (from JSON key)
4. Grant **Viewer** access (or Editor for write-back)

---

## Step 2: Environment Variables

Create `.env.local`:

```bash
# Google Drive Integration
GDRIVE_SERVICE_ACCOUNT_EMAIL=prisma-glow-drive@project.iam.gserviceaccount.com
GDRIVE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"..."}'
GDRIVE_FOLDER_ID=1TLSrbRuhFvFi8o5rhU_gNuFa0beNP7ID  # Agent Learning Resources folder

# Optional: Shared Drive
GDRIVE_SHARED_DRIVE_ID=  # If using Shared Drive

# Enrichment (Gemini)
GEMINI_API_KEY=AIza...

# Embeddings (OpenAI)
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional Configuration
KB_OCR_PROVIDER=none  # or 'google' for Document AI
KB_EMBEDDING_MODEL=text-embedding-3-small
KB_CHUNK_SIZE=1000
KB_CHUNK_OVERLAP=150
```

---

## Step 3: Database Migration

Run the KB schema migration:

```bash
cd supabase
supabase db push
```

Or apply specific migration:

```bash
supabase migration up 20260103000000_kb_comprehensive_schema
```

---

## Step 4: Verify Setup

### Test Drive Connection
```bash
pnpm kb:verify-drive --org-id=<your-org-id>
```

### Test Retrieval
```bash
pnpm kb:test-retrieval --query="What is IFRS 15?" --org-id=<your-org-id>
```

---

## Step 5: Initial Backfill

```bash
# Dry run first
pnpm kb:backfill --org-id=<your-org-id> --dry-run

# Full backfill
pnpm kb:backfill --org-id=<your-org-id>
```

---

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `GDRIVE_SERVICE_ACCOUNT_KEY must be valid JSON` | Invalid key format | Ensure key is single-line JSON |
| `User does not have access to folder` | Sharing not configured | Share folder with service account |
| `pgvector extension not installed` | Missing extension | Run `CREATE EXTENSION vector;` |

### Logs

View ingestion logs:
```bash
supabase functions logs kb-sync --tail
```
