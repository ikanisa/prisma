# Agent Registry - Environment Variables

## Required Variables

### OpenAI Configuration
```bash
# OpenAI API Key (required for OpenAI agents)
OPENAI_API_KEY=sk-...

# OpenAI Model (optional, defaults to gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini

# OpenAI Organization (optional)
OPENAI_ORG_ID=org-...
```

### Gemini Configuration
```bash
# Google Gemini API Key (required for Gemini agents)
GEMINI_API_KEY=AIza...

# Gemini Model (optional, defaults to gemini-2.0-flash-exp)
GEMINI_MODEL=gemini-2.0-flash-exp
```

### Supabase Configuration
```bash
# Supabase URL (required for search tools)
SUPABASE_URL=https://your-project.supabase.co

# Supabase Service Role Key (required)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Supabase Anon Key (optional, for client-side)
SUPABASE_ANON_KEY=eyJ...
```

### Agent Registry Configuration
```bash
# Path to registry file (optional, defaults to ./agents.registry.yaml)
AGENT_REGISTRY_PATH=./agents.registry.yaml

# Enable registry caching (optional, defaults to true)
AGENT_REGISTRY_CACHE=true

# Default engine (optional, defaults to agent preference)
AGENT_DEFAULT_ENGINE=openai

# Enable engine fallback (optional, defaults to true)
AGENT_ENABLE_FALLBACK=true
```

### API Configuration
```bash
# Base URL for API (optional)
API_BASE_URL=http://localhost:3001

# Enable authentication (optional, defaults to false)
AGENT_API_REQUIRE_AUTH=false

# API Rate Limit (optional, requests per minute)
AGENT_API_RATE_LIMIT=60
```

## Optional Variables

### Logging & Monitoring
```bash
# Log level (optional, defaults to info)
LOG_LEVEL=info

# Enable agent execution logging (optional)
AGENT_LOG_EXECUTIONS=true

# Enable performance metrics (optional)
AGENT_ENABLE_METRICS=true

# Metrics endpoint (optional)
METRICS_ENDPOINT=http://localhost:9090
```

### Feature Flags
```bash
# Enable experimental features (optional)
AGENT_ENABLE_EXPERIMENTAL=false

# Enable agent result caching (optional)
AGENT_CACHE_RESULTS=true

# Cache TTL in seconds (optional, defaults to 300)
AGENT_CACHE_TTL=300
```

### Development
```bash
# Node environment
NODE_ENV=development

# Enable debug mode (optional)
DEBUG=agent:*

# Enable hot reload (optional)
AGENT_HOT_RELOAD=true
```

## Environment Files

### .env.example
Create a template for your team:

```bash
# Copy this file to .env and fill in your values
# DO NOT commit .env to git

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash-exp

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# Agent Registry
AGENT_REGISTRY_PATH=./agents.registry.yaml
AGENT_DEFAULT_ENGINE=openai

# API
API_BASE_URL=http://localhost:3001
AGENT_API_REQUIRE_AUTH=false

# Logging
LOG_LEVEL=info
AGENT_LOG_EXECUTIONS=true
```

### .env.development
Development-specific settings:

```bash
NODE_ENV=development
DEBUG=agent:*
AGENT_HOT_RELOAD=true
AGENT_CACHE_RESULTS=false
LOG_LEVEL=debug
```

### .env.production
Production settings:

```bash
NODE_ENV=production
AGENT_CACHE_RESULTS=true
AGENT_CACHE_TTL=600
AGENT_API_REQUIRE_AUTH=true
AGENT_API_RATE_LIMIT=100
LOG_LEVEL=info
AGENT_ENABLE_METRICS=true
```

## Docker Compose

```yaml
# docker-compose.yml
services:
  gateway:
    image: prisma-glow-gateway
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - AGENT_REGISTRY_PATH=/app/agents.registry.yaml
      - NODE_ENV=production
    volumes:
      - ./agents.registry.yaml:/app/agents.registry.yaml:ro
```

## Kubernetes

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: agent-registry-config
data:
  AGENT_DEFAULT_ENGINE: "openai"
  AGENT_CACHE_RESULTS: "true"
  LOG_LEVEL: "info"
  
---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: agent-registry-secrets
type: Opaque
stringData:
  OPENAI_API_KEY: "sk-..."
  GEMINI_API_KEY: "AIza..."
  SUPABASE_SERVICE_ROLE_KEY: "eyJ..."
```

## Validation

### Check Required Variables

```bash
#!/bin/bash
# scripts/validate-env.sh

required_vars=(
  "OPENAI_API_KEY"
  "GEMINI_API_KEY"
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
)

missing=()
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables:"
  for var in "${missing[@]}"; do
    echo "   - $var"
  done
  exit 1
fi

echo "✅ All required environment variables set"
```

### Runtime Validation

```typescript
// src/config/validate.ts
export function validateConfig() {
  const required = [
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
```

## Security Best Practices

1. **Never commit secrets to git**
   - Add `.env` to `.gitignore`
   - Use `.env.example` as template

2. **Use secret management**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Kubernetes Secrets

3. **Rotate keys regularly**
   - OpenAI API keys
   - Supabase keys
   - Service account keys

4. **Limit key permissions**
   - Use least-privilege principle
   - Separate keys for dev/staging/prod

5. **Monitor API usage**
   - Track API key usage
   - Set up alerts for unusual activity
   - Monitor rate limits

## Troubleshooting

### Issue: "OpenAI API key not found"
**Solution:** Ensure `OPENAI_API_KEY` is set in environment

### Issue: "Registry file not found"
**Solution:** Check `AGENT_REGISTRY_PATH` points to correct file

### Issue: "Supabase connection failed"
**Solution:** Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Issue: "Rate limit exceeded"
**Solution:** Adjust `AGENT_API_RATE_LIMIT` or upgrade API plan

## Example: Loading Environment Variables

```typescript
// src/config/env.ts
import dotenv from "dotenv";

// Load from .env file
dotenv.config();

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    orgId: process.env.OPENAI_ORG_ID,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
  },
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    anonKey: process.env.SUPABASE_ANON_KEY,
  },
  agent: {
    registryPath: process.env.AGENT_REGISTRY_PATH || "./agents.registry.yaml",
    defaultEngine: process.env.AGENT_DEFAULT_ENGINE || "openai",
    cacheResults: process.env.AGENT_CACHE_RESULTS === "true",
  },
};

// Validate on startup
export function validateEnv() {
  const errors: string[] = [];

  if (!config.openai.apiKey) errors.push("OPENAI_API_KEY is required");
  if (!config.gemini.apiKey) errors.push("GEMINI_API_KEY is required");
  if (!config.supabase.url) errors.push("SUPABASE_URL is required");
  if (!config.supabase.serviceRoleKey) errors.push("SUPABASE_SERVICE_ROLE_KEY is required");

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join("\n")}`);
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up environment
        run: |
          echo "OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}" >> .env
          echo "GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}" >> .env
          echo "SUPABASE_URL=${{ secrets.SUPABASE_URL }}" >> .env
          
      - name: Validate environment
        run: bash scripts/validate-env.sh
        
      - name: Deploy
        run: npm run deploy
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  variables:
    OPENAI_API_KEY: $OPENAI_API_KEY
    GEMINI_API_KEY: $GEMINI_API_KEY
    SUPABASE_URL: $SUPABASE_URL
  script:
    - bash scripts/validate-env.sh
    - npm run deploy
  only:
    - main
```

## References

- OpenAI API Docs: https://platform.openai.com/docs
- Google Gemini API: https://ai.google.dev/docs
- Supabase Docs: https://supabase.com/docs
- Node.js env best practices: https://nodejs.org/en/docs/guides/
