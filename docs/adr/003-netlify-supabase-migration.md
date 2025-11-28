# ADR 003: Migrate to Netlify + Supabase Serverless Architecture

- **Status**: Accepted
- **Date**: 2025-11-07
- **Owners**: Platform Team
- **Tags**: infrastructure, deployment, architecture, netlify, supabase

## Context

Prisma Glow was originally architected as a self-hosted application with:
- FastAPI backend requiring Python runtime
- Express.js Gateway for API routing
- Docker Compose orchestration for multiple services
- Cloudflare Tunnel for production ingress
- Vercel deployment workflows for preview/staging environments
- Self-managed infrastructure requiring operational overhead

This architecture introduced several challenges:
1. **High Operational Complexity**: Multiple services (gateway, rag, agent, analytics) requiring coordination
2. **Infrastructure Maintenance**: Managing Docker, Cloudflare tunnels, and reverse proxies
3. **Deployment Friction**: Complex multi-service deployment with potential for inconsistency
4. **Scaling Limitations**: Vertical scaling only; no auto-scaling capabilities
5. **Cost Inefficiency**: Always-on services regardless of traffic
6. **Developer Experience**: Complex local development setup with multiple dependencies

## Decision

We will migrate from self-hosted architecture to a **serverless architecture** using:

### Frontend: Netlify
- Host PWA (Progressive Web App) on Netlify CDN
- Static site generation with Next.js
- Automatic HTTPS with Let's Encrypt
- Global CDN with edge caching
- Preview deployments for pull requests
- Zero-downtime deployments with instant rollback

### Backend: Supabase
- **PostgreSQL Database**: Managed PostgreSQL 15 with automatic backups
- **Authentication**: Built-in auth with JWT, OAuth providers
- **Edge Functions**: Deno-based serverless functions replacing FastAPI/Express
- **Realtime**: WebSocket subscriptions for live data
- **Storage**: File storage with CDN integration
- **Row Level Security (RLS)**: Database-level access control

### Benefits:
1. **Zero Infrastructure Management**: No servers to maintain, patch, or monitor
2. **Auto-scaling**: Automatic scaling based on demand
3. **Cost Optimization**: Pay only for usage; no idle infrastructure costs
4. **Improved DX**: Simplified local development with Supabase CLI
5. **Better Performance**: Global CDN edge caching reduces latency
6. **Enhanced Security**: Managed security updates, automatic SSL, RLS policies
7. **Faster Deployments**: Git-based deployments with automatic previews

## Alternatives Considered

### 1. Keep Self-Hosted with Kubernetes
**Rejected**: Increases complexity significantly; requires Kubernetes expertise and operational overhead.

### 2. AWS Lambda + API Gateway
**Rejected**: More vendor lock-in than Supabase; higher complexity; less integrated authentication/database solution.

### 3. Vercel + Supabase
**Rejected**: Vercel has usage limits that could become expensive at scale; Netlify offers better PWA support and more generous free tier.

### 4. Keep Current Architecture with Improvements
**Rejected**: Doesn't address core issues of operational complexity and scaling limitations.

## Consequences

### Positive
- **Reduced Operational Burden**: No infrastructure to manage or patch
- **Cost Savings**: Estimated 60-70% reduction in infrastructure costs (from ~$150/month to ~$44/month)
- **Better Developer Experience**: Simpler local development, faster iteration
- **Improved Security**: Managed security patches, automatic SSL certificates
- **Global Performance**: CDN edge caching improves load times globally
- **Simplified CI/CD**: Single deployment target instead of multi-service orchestration
- **Auto-scaling**: Handles traffic spikes automatically
- **Preview Environments**: Automatic preview deployments for every PR

### Negative
- **Vendor Lock-in**: Increased dependency on Netlify and Supabase platforms
- **Migration Effort**: One-time effort to migrate existing services to Edge Functions
- **Learning Curve**: Team needs to learn Supabase Edge Functions (Deno runtime)
- **Function Limitations**: Edge Functions have execution time limits (50s on Supabase Pro)
- **Cold Starts**: Edge Functions may have cold start latency (typically <100ms)

### Neutral
- **Different Monitoring**: Need to adapt monitoring to serverless architecture
- **Different Debugging**: Serverless debugging requires different tools and approaches

## Implementation Plan

### Phase 1: Infrastructure Cleanup (This ADR)
- [x] Remove `.vercel/` directory
- [x] Remove Vercel deployment workflow (`.github/workflows/vercel-deploy.yml`)
- [x] Remove Vercel deployment scripts (`scripts/deploy/`)
- [x] Remove Cloudflare tunnel configuration (`infra/cloudflared/`)
- [x] Remove Cloudflare installation scripts (`scripts/mac/install_cloudflared.sh`)
- [x] Create Netlify configuration (`netlify.toml`)
- [x] Create Netlify deployment workflow (`.github/workflows/deploy-netlify.yml`)
- [x] Update documentation to remove Cloudflare/Vercel references
- [x] Create migration guide (`docs/deployment/netlify-supabase.md`)

### Phase 2: Supabase Setup (Future)
- [ ] Set up Supabase project (database, auth, storage)
- [ ] Migrate database schema to Supabase
- [ ] Apply Row Level Security policies
- [ ] Configure authentication providers

### Phase 3: Edge Functions Migration (Future)
- [ ] Identify API endpoints to migrate
- [ ] Implement Supabase Edge Functions replacing FastAPI endpoints
- [ ] Implement Edge Functions replacing Express Gateway routes
- [ ] Test Edge Functions thoroughly

### Phase 4: Frontend Migration (Future)
- [ ] Configure Next.js for static export
- [ ] Update frontend to use Supabase client
- [ ] Configure PWA manifest and service worker
- [ ] Test PWA installation and offline mode

### Phase 5: Deployment & Validation (Future)
- [ ] Deploy to Netlify staging environment
- [ ] Run integration tests
- [ ] Load testing with Artillery/k6
- [ ] Lighthouse audits (target: 90+ scores)
- [ ] Production deployment
- [ ] Monitor and optimize

## Migration Risk Mitigation

1. **Gradual Migration**: Keep both architectures running in parallel during transition
2. **Feature Flags**: Use feature flags to switch between old and new implementations
3. **Rollback Plan**: Documented rollback procedure in deployment guide
4. **Testing**: Comprehensive integration and load testing before production cutover
5. **Monitoring**: Enhanced monitoring during migration period
6. **Communication**: Clear communication to stakeholders about migration timeline

## References

- [Netlify Documentation](https://docs.netlify.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Migration Guide](../deployment/netlify-supabase.md)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- GitHub Issue: [Link to original issue/RFC]
