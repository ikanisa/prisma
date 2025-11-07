# Prisma Glow - Netlify + Supabase Refactoring Plan

## New Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Netlify CDN   │────▶│  Client PWA      │────▶│    Supabase      │
│   (Frontend)    │     │  (React/Next.js) │     │  - PostgreSQL    │
└─────────────────┘     └──────────────────┘     │  - Auth          │
                                 │                │  - Edge Funcs    │
                                 │                │  - Realtime      │
                                 └───────────────▶│  - Storage       │
                                                  └──────────────────┘
```

## Architecture Comparison

### Before (Self-Hosted)
```
Client → Cloudflare Tunnel → Express Gateway → FastAPI → PostgreSQL
                              ↓
                         Docker Compose
                         - 6 Services
                         - Always-on infrastructure
                         - Manual scaling
```

### After (Serverless)
```
Client → Netlify CDN → Supabase Edge Functions → PostgreSQL (Supabase)
         - Auto-scaling
         - Pay-per-use
         - Managed infrastructure
```

## Migration Status

### ✅ Phase 1: Infrastructure Cleanup (COMPLETED)
- [x] Remove Vercel configuration (`.vercel/` directory)
- [x] Remove Vercel deployment workflow (`vercel-deploy.yml`)
- [x] Remove Vercel deployment scripts (`scripts/deploy/`)
- [x] Remove Cloudflare tunnel configuration (`infra/cloudflared/`)
- [x] Remove Cloudflare installation scripts
- [x] Create Netlify configuration (`netlify.toml`)
- [x] Create Netlify deployment workflow (`deploy-netlify.yml`)
- [x] Update documentation (architecture.md, local-hosting.md, etc.)
- [x] Create comprehensive deployment guide
- [x] Create ADR 003 documenting architectural decision
- [x] Create migration automation script

### 🔄 Phase 2: Core Configuration Files (PENDING)

#### Root Configuration
- [ ] Update `turbo.json` for Netlify build optimization
- [ ] Update `.gitignore` to exclude Netlify build artifacts
- [ ] Configure Netlify environment variables template

#### Next.js Configuration (apps/web)
- [ ] Update `next.config.mjs` for static export
- [ ] Configure PWA manifest and service worker
- [ ] Set up Sentry for Next.js with Netlify
- [ ] Configure image optimization for static export
- [ ] Update security headers for Netlify

### 🔄 Phase 3: Supabase Setup (PENDING)

#### Database
- [ ] Create Supabase project
- [ ] Migrate database schema to Supabase
- [ ] Apply Row Level Security (RLS) policies
- [ ] Set up database migrations workflow
- [ ] Configure connection pooling

#### Authentication
- [ ] Configure Supabase Auth
- [ ] Set up OAuth providers (Google, GitHub)
- [ ] Configure redirect URLs for Netlify
- [ ] Implement JWT token validation
- [ ] Set up user management

#### Storage
- [ ] Configure Supabase Storage buckets
- [ ] Set up storage policies
- [ ] Migrate existing files (if any)
- [ ] Configure CDN for storage

### 🔄 Phase 4: Edge Functions Migration (PENDING)

#### API Gateway Endpoints (Express.js)
- [ ] Audit existing Express Gateway endpoints
- [ ] Create Supabase Edge Functions for each route
- [ ] Implement CORS configuration
- [ ] Add rate limiting
- [ ] Implement error handling and logging

#### FastAPI Endpoints (Python)
- [ ] Audit existing FastAPI endpoints
- [ ] Convert Python logic to TypeScript/Deno
- [ ] Create corresponding Edge Functions
- [ ] Implement OpenAI integration in Edge Functions
- [ ] Set up embedding generation

#### RAG Service
- [ ] Migrate vector search to Supabase pgvector
- [ ] Implement document ingestion in Edge Functions
- [ ] Set up embedding pipeline
- [ ] Configure vector similarity search

### 🔄 Phase 5: Frontend Migration (PENDING)

#### Client PWA (apps/web)
- [ ] Update Supabase client initialization
- [ ] Replace API calls with Supabase queries
- [ ] Implement realtime subscriptions
- [ ] Configure offline support
- [ ] Update authentication flow
- [ ] Test PWA installation

#### Admin Panel (apps/admin)
- [ ] Migrate to Netlify deployment
- [ ] Update API integration
- [ ] Configure authentication
- [ ] Test admin workflows

#### Mobile SDKs (future)
- [ ] Plan React Native integration
- [ ] Configure Supabase mobile client
- [ ] Implement offline sync

### 🔄 Phase 6: CI/CD Pipeline (PENDING)

#### GitHub Actions
- [ ] Test `deploy-netlify.yml` workflow
- [ ] Add Netlify secrets to GitHub
- [ ] Configure branch deployments
- [ ] Set up preview deployments for PRs
- [ ] Add Lighthouse CI checks

#### Supabase Migrations
- [ ] Set up automated migration workflow
- [ ] Configure migration rollback strategy
- [ ] Add migration testing

### 🔄 Phase 7: Testing & Validation (PENDING)

#### Integration Tests
- [ ] Update tests for Supabase client
- [ ] Test authentication flow
- [ ] Test Edge Functions
- [ ] Test offline functionality

#### Performance Tests
- [ ] Run k6 load tests
- [ ] Run Artillery performance tests
- [ ] Lighthouse audits (target: 90+ scores)
- [ ] Test cold start performance

#### Security Tests
- [ ] Verify RLS policies
- [ ] Test authentication flows
- [ ] Run security scans
- [ ] Validate CORS configuration

### 🔄 Phase 8: Deployment (PENDING)

#### Staging Environment
- [ ] Deploy to Netlify staging
- [ ] Configure staging Supabase project
- [ ] Run integration tests
- [ ] Perform UAT (User Acceptance Testing)

#### Production Environment
- [ ] Deploy to Netlify production
- [ ] Configure production Supabase project
- [ ] Set up monitoring and alerting
- [ ] Configure custom domain
- [ ] Enable CDN optimization

#### Post-Deployment
- [ ] Monitor error rates
- [ ] Verify PWA installation
- [ ] Test offline mode
- [ ] Validate performance metrics
- [ ] Document lessons learned

## Key Files Structure

### Configuration Files
```
prisma-glow/
├── netlify.toml                          # Netlify deployment config
├── .github/workflows/
│   └── deploy-netlify.yml               # Netlify CI/CD workflow
├── supabase/
│   ├── config.toml                      # Supabase project config
│   ├── migrations/                      # Database migrations
│   └── functions/                       # Edge Functions
│       ├── api-gateway/
│       │   └── index.ts                # Main API gateway
│       ├── rag/
│       │   └── index.ts                # RAG service
│       └── auth/
│           └── index.ts                # Auth helpers
├── apps/
│   ├── web/                            # Next.js PWA
│   │   ├── next.config.mjs            # Next.js config
│   │   ├── public/
│   │   │   └── manifest.json          # PWA manifest
│   │   └── app/
│   │       └── layout.tsx             # Root layout
│   └── admin/                          # Admin panel
├── packages/
│   └── supabase-client/               # Supabase client wrapper
│       └── src/
│           └── index.ts               # Client initialization
└── docs/
    ├── deployment/
    │   └── netlify-supabase.md        # Deployment guide
    └── adr/
        └── 003-netlify-supabase-migration.md  # ADR
```

## Environment Variables

### Netlify Environment Variables (Required)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_ID=your-project-id

# Build Configuration
NODE_ENV=production
PNPM_VERSION=9.12.3

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-token

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

### GitHub Secrets (Required)
```bash
# Netlify
NETLIFY_AUTH_TOKEN=your-netlify-token
NETLIFY_SITE_ID=your-site-id
NETLIFY_STAGING_SITE_ID=your-staging-site-id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Deployment Checklist

### Pre-Deployment
- [ ] All code changes committed and pushed
- [ ] `pnpm install --frozen-lockfile` succeeds
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm run test` passes
- [ ] `pnpm run build` succeeds
- [ ] All environment variables configured

### Netlify Configuration
- [ ] GitHub repository connected
- [ ] Build command set: `pnpm run build:netlify`
- [ ] Publish directory set: `dist`
- [ ] Node version set: 20
- [ ] Environment variables configured
- [ ] Custom domain configured (optional)
- [ ] SSL certificate enabled

### Supabase Configuration
- [ ] Project created
- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Auth providers enabled
- [ ] Edge Functions deployed
- [ ] Storage buckets created

### Post-Deployment Verification
- [ ] Site accessible at deployment URL
- [ ] PWA installs correctly
- [ ] Authentication works
- [ ] Database queries succeed
- [ ] Edge Functions respond
- [ ] Offline mode works
- [ ] Lighthouse audit scores ≥90

## Cost Comparison

### Current (Self-Hosted)
```
DigitalOcean/AWS: ~$100/month
Cloudflare Tunnel: $0 (free tier)
Vercel: ~$50/month (team plan)
Total: ~$150/month
```

### After Migration (Serverless)
```
Netlify Pro: $19/month
Supabase Pro: $25/month
Total: ~$44/month
Savings: ~70% ($106/month)
```

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Infrastructure Cleanup | 1 day | ✅ COMPLETED |
| Phase 2: Core Configuration | 2-3 days | 🔄 PENDING |
| Phase 3: Supabase Setup | 3-5 days | 🔄 PENDING |
| Phase 4: Edge Functions | 1-2 weeks | 🔄 PENDING |
| Phase 5: Frontend Migration | 1 week | 🔄 PENDING |
| Phase 6: CI/CD Pipeline | 2-3 days | 🔄 PENDING |
| Phase 7: Testing | 1 week | 🔄 PENDING |
| Phase 8: Deployment | 2-3 days | 🔄 PENDING |
| **Total** | **4-6 weeks** | **20% Complete** |

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Edge Function limitations | High | Medium | Identify heavy operations early; consider hybrid approach |
| Cold start latency | Medium | High | Implement keep-warm strategies; optimize function size |
| Vendor lock-in | Medium | High | Document migration paths; use standard APIs where possible |
| Data migration issues | High | Low | Thorough testing; staged rollout; maintain backups |
| Performance degradation | High | Low | Load testing; monitoring; rollback plan |

## Success Criteria

1. **Performance**: Lighthouse scores ≥90 across all metrics
2. **Availability**: 99.9% uptime (monitored)
3. **Cost**: Infrastructure costs reduced by ≥60%
4. **Developer Experience**: Deployment time reduced by ≥50%
5. **Security**: Zero critical vulnerabilities, all RLS policies active
6. **Functionality**: All features working in production

## Support & Documentation

- **Migration Guide**: `docs/deployment/netlify-supabase.md`
- **Architecture Decision**: `docs/adr/003-netlify-supabase-migration.md`
- **Netlify Docs**: https://docs.netlify.com
- **Supabase Docs**: https://supabase.com/docs
- **Team Support**: GitHub Discussions

---

**Last Updated**: 2025-11-07  
**Status**: Phase 1 Complete (20%)  
**Next Milestone**: Complete Phase 2 (Core Configuration)
