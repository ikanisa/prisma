# Local Development & Deployment

## Setup

1. Copy `.env.example` into `/server/.env` and fill in your credentials.
2. Start Supabase locally:
   ```bash
   supabase start
   ```

## Serving Edge Functions Locally

From the repo root:
```bash
supabase functions serve --no-verify-jwt --project-ref $SUPABASE_PROJECT_ID
```

## Deploying to Supabase

After changes:
```bash
supabase db push            # Apply migrations to remote database
supabase functions deploy   # Deploy Edge Functions (e.g. whatsapp-webhook)
```
