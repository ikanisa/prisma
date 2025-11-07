# Netlify + Supabase Deployment Checklist

This checklist ensures successful deployment of Prisma Glow to Netlify with Supabase backend.

## Pre-Deployment Steps

### ✅ Code Quality
- [x] Run `pnpm install --frozen-lockfile` - Dependencies installed
- [x] Run `pnpm run typecheck` - TypeScript validation passes
- [x] Run `pnpm run lint` - Code style validated (ESLint may need fixing)
- [ ] Run `pnpm run test` - All tests pass
- [ ] Run `pnpm run build:netlify` - Production build succeeds
- [x] All changes committed to git
- [x] ADR created and documented

### ✅ Configuration Files
- [x] `netlify.toml` exists and is configured
- [ ] `.env.production` configured locally (not committed)
- [x] `.env.example` updated with required variables
- [ ] `supabase/config.toml` configured
- [x] GitHub workflow `deploy-netlify.yml` created

### ✅ Documentation
- [x] Architecture documentation updated
- [x] Deployment guide created (`docs/deployment/netlify-supabase.md`)
- [x] Migration script created (`scripts/migrate-to-netlify.sh`)
- [x] ADR 003 created and approved
- [x] Old documentation removed/updated

## Netlify Setup

### Account & Project Setup
- [ ] Netlify account created at https://app.netlify.com
- [ ] GitHub repository connected
- [ ] New site created or existing site configured
- [ ] Site ID obtained and saved

### Build Configuration
- [ ] Build command set to: `pnpm run build:netlify`
- [ ] Publish directory set to: `dist`
- [ ] Base directory: (leave empty)
- [ ] Node version set to: `20`
- [ ] Build environment variables configured

### Environment Variables (Netlify Dashboard)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (sensitive)
- [ ] `SUPABASE_PROJECT_ID` set
- [ ] `NODE_ENV` set to `production`
- [ ] `PNPM_VERSION` set to `9.12.3`
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set (optional)
- [ ] `SENTRY_AUTH_TOKEN` set (optional, sensitive)

### Deployment Settings
- [ ] Automatic deploys enabled for main branch
- [ ] Deploy previews enabled for pull requests
- [ ] Branch deploys configured (optional)
- [ ] Deploy notifications configured

### Domain & SSL
- [ ] Custom domain added (optional)
- [ ] DNS records configured (if custom domain)
- [ ] SSL certificate provisioned (automatic)
- [ ] HTTPS redirect enabled
- [ ] Domain verified and active

## Supabase Setup

### Project Creation
- [ ] Supabase account created at https://app.supabase.com
- [ ] New project created
- [ ] Project name: `prisma-glow-prod`
- [ ] Region selected (closest to users)
- [ ] Database password saved securely
- [ ] Project URL noted: `https://YOUR_PROJECT_REF.supabase.co`

### Database Configuration
- [ ] Supabase CLI installed: `npm install -g supabase`
- [ ] CLI authenticated: `supabase login`
- [ ] Project linked: `supabase link --project-ref YOUR_PROJECT_REF`
- [ ] Database migrations applied: `supabase db push`
- [ ] Schema validated
- [ ] Test data seeded (optional)

### Row Level Security (RLS)
- [ ] RLS enabled on all tables: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`
- [ ] Read policies created and tested
- [ ] Write policies created and tested
- [ ] Delete policies created and tested
- [ ] Admin bypass policies created (if needed)
- [ ] Policies tested with different user roles

### Authentication Setup
- [ ] Email/Password provider enabled
- [ ] Email confirmation configured (optional)
- [ ] Password reset flow configured
- [ ] Site URL set to Netlify domain
- [ ] Redirect URLs configured:
  - [ ] `https://your-site.netlify.app/auth/callback`
  - [ ] `http://localhost:3000/auth/callback` (dev)
- [ ] OAuth providers enabled (optional):
  - [ ] Google OAuth configured
  - [ ] GitHub OAuth configured
  - [ ] Provider credentials saved

### Edge Functions
- [ ] Edge Functions created in `supabase/functions/`
- [ ] Functions deployed: `supabase functions deploy`
- [ ] Function environment variables set
- [ ] CORS headers configured
- [ ] Functions tested with curl/Postman
- [ ] Function logs reviewed

### Storage
- [ ] Storage buckets created
- [ ] Bucket policies configured
- [ ] Public access configured (if needed)
- [ ] File upload tested
- [ ] CDN enabled for storage
- [ ] File size limits configured

### API Keys & Secrets
- [ ] Anon key obtained from Supabase dashboard
- [ ] Service role key obtained (keep secure!)
- [ ] JWT secret noted (for verification)
- [ ] Database connection string obtained
- [ ] Keys added to Netlify environment variables

## GitHub Actions Setup

### Repository Secrets
- [ ] `NETLIFY_AUTH_TOKEN` added to GitHub secrets
- [ ] `NETLIFY_SITE_ID` added to GitHub secrets
- [ ] `NETLIFY_STAGING_SITE_ID` added (optional)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` added
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` added
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added

### Workflow Validation
- [ ] `.github/workflows/deploy-netlify.yml` exists
- [ ] Workflow syntax validated
- [ ] Workflow triggers configured correctly
- [ ] Workflow permissions set appropriately

### Netlify Personal Access Token
- [ ] Token created in Netlify: User settings → Applications → New access token
- [ ] Token name: `GitHub Actions`
- [ ] Token saved to GitHub secrets as `NETLIFY_AUTH_TOKEN`

## First Deployment

### Pre-Deploy Validation
- [ ] All code changes committed
- [ ] All tests passing locally
- [ ] Build succeeds locally: `pnpm run build:netlify`
- [ ] No sensitive data in code
- [ ] `.env` files not committed

### Deploy to Production
- [ ] Create deployment branch or merge to main
- [ ] Push to GitHub: `git push origin main`
- [ ] Monitor GitHub Actions workflow
- [ ] Monitor Netlify deploy log
- [ ] Wait for deployment completion (~5-10 minutes)

### Initial Deployment Checks
- [ ] Deployment succeeded (green checkmark in Netlify)
- [ ] No build errors in Netlify logs
- [ ] No deployment errors in GitHub Actions
- [ ] Site accessible at deployment URL
- [ ] No console errors in browser DevTools

## Post-Deployment Verification

### Functional Testing
- [ ] Site loads correctly
- [ ] All pages accessible
- [ ] Navigation works
- [ ] Forms submit successfully
- [ ] API calls succeed

### Authentication Testing
- [ ] Registration flow works
- [ ] Login flow works
- [ ] Logout works
- [ ] Password reset works
- [ ] OAuth login works (if configured)
- [ ] Protected routes require authentication
- [ ] JWT tokens generated correctly

### Database Testing
- [ ] Database queries succeed
- [ ] Data displays correctly
- [ ] CRUD operations work
- [ ] RLS policies enforced
- [ ] No unauthorized data access

### PWA Testing
#### Desktop
- [ ] PWA install prompt appears
- [ ] App installs successfully
- [ ] Installed app opens in standalone window
- [ ] App icon displays correctly
- [ ] Service worker registered
- [ ] Offline mode works
- [ ] Cache updates correctly

#### Mobile
- [ ] Open site in mobile browser
- [ ] "Add to Home Screen" option available
- [ ] App installs successfully
- [ ] App icon on home screen
- [ ] Splash screen displays
- [ ] Offline mode works
- [ ] Push notifications work (if implemented)

### Performance Testing
- [ ] Lighthouse audit run (Chrome DevTools → Lighthouse)
- [ ] Performance score ≥90
- [ ] Accessibility score ≥95
- [ ] Best Practices score ≥95
- [ ] SEO score ≥90
- [ ] PWA score = 100
- [ ] First Contentful Paint (FCP) <1.8s
- [ ] Time to Interactive (TTI) <3.8s
- [ ] Total Blocking Time (TBT) <300ms
- [ ] Cumulative Layout Shift (CLS) <0.1

### Load Testing
- [ ] k6 performance tests run: `pnpm run test:performance`
- [ ] Artillery load tests run: `pnpm run load:test`
- [ ] Test results reviewed
- [ ] No errors under load
- [ ] Response times acceptable
- [ ] Edge Functions handle concurrent requests

### Security Testing
- [ ] HTTPS enabled and forced
- [ ] Security headers present (check in browser Network tab)
- [ ] No mixed content warnings
- [ ] XSS protection active
- [ ] CSRF protection active
- [ ] RLS policies tested with different users
- [ ] No sensitive data in client bundle
- [ ] API keys not exposed in frontend

### Edge Function Testing
- [ ] All Edge Functions respond correctly
- [ ] CORS headers present
- [ ] Error handling works
- [ ] Rate limiting enforced (if implemented)
- [ ] Logs available in Supabase dashboard
- [ ] Function performance acceptable

## Monitoring & Observability

### Netlify Monitoring
- [ ] Netlify Analytics enabled (optional, $9/month)
- [ ] Deploy notifications configured:
  - [ ] Email notifications
  - [ ] Slack notifications (optional)
- [ ] Custom alerts configured
- [ ] Build logs accessible

### Supabase Monitoring
- [ ] Database monitoring dashboard reviewed
- [ ] API usage metrics checked
- [ ] Edge Function logs reviewed
- [ ] Connection pool utilization checked
- [ ] Storage usage monitored

### Sentry Error Tracking
- [ ] Sentry project created
- [ ] Sentry DSN configured
- [ ] Source maps uploaded
- [ ] Error tracking active
- [ ] Alerts configured for critical errors
- [ ] Release tracking configured

### Uptime Monitoring (Optional)
- [ ] External uptime monitor configured:
  - [ ] Pingdom, UptimeRobot, or Better Uptime
- [ ] Check interval: 1-5 minutes
- [ ] Alert email configured
- [ ] Alert SMS/Slack configured (optional)
- [ ] Status page created (optional)

## Rollback Plan

### Netlify Rollback
- [ ] Previous deploy ID noted
- [ ] Rollback tested in staging
- [ ] Rollback command ready: `netlify deploy:rollback DEPLOY_ID`
- [ ] Team notified of rollback procedure
- [ ] Communication plan in place

### Database Rollback
- [ ] Database backup verified
- [ ] Rollback SQL scripts prepared
- [ ] Rollback tested in staging
- [ ] Downtime communication plan ready

## Documentation Updates

### Internal Documentation
- [ ] Deployment guide updated
- [ ] Architecture diagrams updated
- [ ] API documentation updated
- [ ] Environment variable docs updated
- [ ] Troubleshooting guide updated

### Team Communication
- [ ] Team notified of deployment
- [ ] Deployment notes shared
- [ ] Known issues documented
- [ ] Support contact information shared
- [ ] Incident response plan reviewed

## Ongoing Maintenance

### Daily Tasks
- [ ] Monitor error rates
- [ ] Check build status
- [ ] Review performance metrics
- [ ] Monitor uptime

### Weekly Tasks
- [ ] Review Lighthouse scores
- [ ] Check dependency updates
- [ ] Review security alerts
- [ ] Backup verification

### Monthly Tasks
- [ ] Database backup verification
- [ ] Load testing
- [ ] SSL certificate renewal check (automatic on Netlify)
- [ ] Access token rotation
- [ ] Cost review

## Success Criteria

- [x] Phase 1 Complete: Infrastructure cleaned up
- [ ] Deployment successful
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Security scan passed
- [ ] PWA scores 100
- [ ] No critical errors in monitoring
- [ ] Team trained on new architecture
- [ ] Documentation complete

## Emergency Contacts

- **Primary On-Call**: [Name/Contact]
- **Secondary On-Call**: [Name/Contact]
- **Netlify Support**: https://www.netlify.com/support/
- **Supabase Support**: https://supabase.com/support
- **Team Slack Channel**: [Channel name]

## Additional Resources

- **Deployment Guide**: `docs/deployment/netlify-supabase.md`
- **Migration Script**: `scripts/migrate-to-netlify.sh`
- **ADR 003**: `docs/adr/003-netlify-supabase-migration.md`
- **Netlify Docs**: https://docs.netlify.com
- **Supabase Docs**: https://supabase.com/docs
- **Netlify Status**: https://netlifystatus.com
- **Supabase Status**: https://status.supabase.com

---

**Checklist Version**: 1.0.0  
**Last Updated**: 2025-11-07  
**Status**: Phase 1 Complete (Infrastructure Cleanup)
