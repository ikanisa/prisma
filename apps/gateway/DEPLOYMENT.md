# Gateway API Deployment Guide

The Gateway (`apps/gateway`) is the Express.js backend that executes AI agents. It must be deployed separately from the Cloudflare Pages frontend.

## Quick Local Test

```bash
# From repo root
cd apps/gateway
pnpm install
pnpm dev
# Gateway runs on http://localhost:3001
```

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (not anon key) |
| `OPENAI_API_KEY` | OpenAI API key for agents |
| `GOOGLE_GEMINI_API_KEY` | Google AI key (optional) |
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | `production` for deployed |

## Deployment Options

### Option 1: Railway (Easiest)

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Select your repo
4. Set **Root Directory** to `apps/gateway`
5. Add environment variables in Settings
6. Railway auto-detects Node.js and deploys

Your URL will be like: `https://your-project.up.railway.app`

### Option 2: Google Cloud Run

```bash
# Build and deploy
cd apps/gateway
gcloud run deploy prisma-gateway \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="SUPABASE_URL=xxx,SUPABASE_SERVICE_KEY=xxx,OPENAI_API_KEY=xxx"
```

### Option 3: Docker (Any Host)

```dockerfile
# apps/gateway/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3001
CMD ["pnpm", "start"]
```

```bash
docker build -t prisma-gateway .
docker run -p 3001:3001 -e OPENAI_API_KEY=xxx prisma-gateway
```

## After Deployment

Set this in Cloudflare Pages environment variables:

```
NEXT_PUBLIC_GATEWAY_URL=https://your-gateway-url.com
```

This tells the web app where to send AI requests.
