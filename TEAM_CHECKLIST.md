# SECURITY AUDIT - TEAM CHECKLIST

**Start Date:** 2025-12-01  
**Target Go-Live:** 2025-12-22  
**Status:** ✅ Phase 1 Complete - Ready for Staging  

---

## 🎯 QUICK START

**First time here?**
1. Read: [SECURITY_AUDIT_HANDOFF_REPORT.md](SECURITY_AUDIT_HANDOFF_REPORT.md) (15 min)
2. Run: `./DEPLOYMENT_VALIDATION.sh` (validates implementation)
3. Follow: The checklist below for your team

---

## ✅ PHASE 1: IMPLEMENTATION (COMPLETE)

- [x] Gateway authentication middleware implemented
- [x] Rate limiting middleware implemented  
- [x] CORS security hardened
- [x] Sentry error tracking enabled
- [x] Dependencies added to package.json
- [x] Documentation created (7 docs, 2000+ lines)
- [x] Validation script created
- [x] Environment templates updated

**Completed by:** AI Agent  
**Date:** 2025-12-01  
**Time:** < 1 hour  

---

## 🚀 PHASE 2: STAGING DEPLOYMENT (TODAY)

### DevOps Team - Lead: TBD

#### Prerequisites (5 min)
- [ ] Review [SECURITY_AUDIT_HANDOFF_REPORT.md](SECURITY_AUDIT_HANDOFF_REPORT.md)
- [ ] Verify access to staging environment
- [ ] Confirm Supabase credentials available

#### Installation (5 min)
- [ ] `cd apps/gateway && pnpm install`
- [ ] Verify dependencies installed (check for errors)
- [ ] Run `./DEPLOYMENT_VALIDATION.sh` (should pass)

#### Configuration (10 min)
- [ ] Get JWT secret from Supabase Dashboard → Settings → API
- [ ] Create `.env.staging` with:
  ```bash
  GATEWAY_ALLOWED_ORIGINS=https://staging.prismaglow.com
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_JWT_SECRET=<from-dashboard>
  SUPABASE_JWT_AUDIENCE=authenticated
  NEXT_PUBLIC_SENTRY_DSN=<staging-sentry-dsn>
  NODE_ENV=production
  ```
- [ ] Verify no secrets committed to git

#### Local Testing (15 min)
- [ ] Start gateway: `pnpm --filter @prisma-glow/gateway dev`
- [ ] Test unauthenticated: `curl http://localhost:3001/api/v1/agents`
  - Expected: `401 Unauthorized` ✅
- [ ] Get valid JWT from Supabase (sign in via UI)
- [ ] Test authenticated: `curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/v1/agents`
  - Expected: `200 OK` with data ✅
- [ ] Test rate limiting (make 105 requests, last few should return 429)

#### Staging Deployment (30 min)
- [ ] Build: `pnpm --filter @prisma-glow/gateway build`
- [ ] Deploy: `docker-compose -f docker-compose.staging.yml up -d gateway`
- [ ] Health check: `curl https://staging-api.prismaglow.com/health`
  - Expected: `{"status":"ok"}` ✅
- [ ] Auth test: `curl https://staging-api.prismaglow.com/api/v1/agents`
  - Expected: `401 Unauthorized` ✅
- [ ] Monitor logs for 30 minutes
- [ ] Check Sentry dashboard for errors

#### Sign-off
- [ ] All tests passing
- [ ] No errors in logs
- [ ] Sentry receiving events
- [ ] Documented any issues

**Owner:** _______________  
**Completed:** ___/___/___  

---

## 🏗️ PHASE 3: AUTH ARCHITECTURE (WEEK 1)

### Architecture Team - Lead: TBD

#### Research & Decision (4 hours)
- [ ] Read [CRITICAL_SECURITY_ACTION_PLAN.md](CRITICAL_SECURITY_ACTION_PLAN.md) (Auth Architecture section)
- [ ] Review current auth implementations:
  - [ ] Vite SPA (`src/integrations/supabase/client.ts`)
  - [ ] Next.js app (`apps/web/` - check for NextAuth traces)
- [ ] Document current state and conflicts
- [ ] Evaluate Option A: Unify on Supabase Auth
  - Pros: Already working, simpler, native RLS
  - Cons: Vendor lock-in, limited providers
  - Effort: 2-3 days
- [ ] Evaluate Option B: Migrate to NextAuth
  - Pros: Flexible providers, industry standard
  - Cons: Complex setup, migration work
  - Effort: 5-7 days

#### Decision Making (2 hours)
- [ ] Present options to team
- [ ] Make decision (recommend: Option A - Supabase Auth)
- [ ] Document decision in `docs/adr/010-auth-unification.md`
- [ ] Get stakeholder approval

#### Planning (2 hours)
- [ ] Create implementation ticket
- [ ] Break down into subtasks
- [ ] Assign owner
- [ ] Set deadline: Dec 5
- [ ] Add to sprint planning

#### Sign-off
- [ ] Decision documented
- [ ] Ticket created
- [ ] Owner assigned
- [ ] Deadline set

**Owner:** _______________  
**Deadline:** Dec 5  
**Decision:** [ ] Supabase Auth [ ] NextAuth  

---

## 💻 PHASE 4: BACKEND IMPLEMENTATIONS (WEEK 2)

### Backend Team - Lead: TBD

#### Agent CRUD Operations (2-3 days)
**Files:** `server/api/agents.py`  
**TODOs:** Lines 74, 128, 184, 232, 260

- [ ] Replace mock implementation at line 74 (list_agents)
  - [ ] Implement Supabase query
  - [ ] Add organization_id filter
  - [ ] Add pagination
  - [ ] Test with multiple orgs
- [ ] Replace mock implementation at line 128 (get_agent)
  - [ ] Implement Supabase query with slug
  - [ ] Add organization_id verification
  - [ ] Return 404 if not found
- [ ] Replace mock implementation at line 184 (create_agent)
  - [ ] Implement Supabase insert
  - [ ] Validate organization access
  - [ ] Return created agent
- [ ] Replace mock implementation at line 232 (update_agent)
  - [ ] Implement Supabase update
  - [ ] Verify ownership
  - [ ] Handle concurrent updates
- [ ] Replace mock implementation at line 260 (delete_agent)
  - [ ] Implement soft delete
  - [ ] Verify ownership
  - [ ] Update deleted_at timestamp

#### RLS Policies (1 day)
- [ ] Create RLS policy for agents table:
  ```sql
  CREATE POLICY "Users can view own org agents"
  ON agents FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  ));
  ```
- [ ] Test policy with multiple users
- [ ] Document policies in `supabase/migrations/`

#### Vector Store Endpoints (2-3 days)
**File:** `server/api/vector_stores.py`  
**TODOs:** 11 endpoints (lines 50, 63, 79, 92, 105, 125, 141, 158, 174, 187, 207)

- [ ] Migrate POST /api/v1/vector-stores
- [ ] Migrate GET /api/v1/vector-stores
- [ ] Migrate GET /api/v1/vector-stores/{id}
- [ ] Migrate PATCH /api/v1/vector-stores/{id}
- [ ] Migrate DELETE /api/v1/vector-stores/{id}
- [ ] Migrate POST /api/v1/vector-stores/{id}/files
- [ ] Migrate GET /api/v1/vector-stores/{id}/files
- [ ] Migrate GET /api/v1/vector-stores/{id}/files/{file_id}
- [ ] Migrate DELETE /api/v1/vector-stores/{id}/files/{file_id}
- [ ] Migrate POST /api/v1/vector-stores/{id}/files/{file_id}/search
- [ ] Migrate POST /api/v1/vector-stores/{id}/search

#### Document Endpoints (1 day)
**File:** `server/api/documents.py`  
**TODOs:** 3 endpoints (lines 39, 52, 65)

- [ ] Migrate POST /api/v1/documents/upload
- [ ] Migrate GET /api/v1/documents/{id}
- [ ] Migrate DELETE /api/v1/documents/{id}

#### Testing (2 days)
- [ ] Write integration tests for agent CRUD
- [ ] Test multi-tenant isolation
- [ ] Test RLS policies
- [ ] Load test vector search
- [ ] Document test coverage

#### Sign-off
- [ ] All TODOs completed
- [ ] Tests passing (>60% coverage)
- [ ] RLS policies enforced
- [ ] Documentation updated

**Owner:** _______________  
**Deadline:** Dec 12  

---

## 🔒 PHASE 5: SECURITY TESTING (WEEK 3)

### QA Team - Lead: TBD

#### Penetration Testing (2 days)
- [ ] Auth bypass attempts
- [ ] SQL injection tests
- [ ] CORS bypass attempts
- [ ] Rate limit bypass attempts
- [ ] Session hijacking tests
- [ ] RLS policy verification
- [ ] Document findings

#### Load Testing (1 day)
- [ ] Configure load testing tool (k6 or Artillery)
- [ ] Test 1000 concurrent users
- [ ] Verify rate limiting under load
- [ ] Check database connection pooling
- [ ] Monitor memory usage
- [ ] Document results

#### Production Readiness (1 day)
- [ ] Review all security findings
- [ ] Verify all critical issues fixed
- [ ] Sign off on security audit
- [ ] Update production checklist

**Owner:** _______________  
**Deadline:** Dec 19  

---

## 🚀 PHASE 6: PRODUCTION DEPLOYMENT (DEC 22)

### DevOps Team - Lead: TBD

#### Pre-deployment (2 hours)
- [ ] Staging tested for minimum 1 week
- [ ] All Phase 4 work complete
- [ ] Security audit passed
- [ ] Load testing passed
- [ ] Backup current production
- [ ] Prepare rollback plan

#### Deployment (2 hours)
- [ ] Deploy gateway updates
- [ ] Monitor health endpoints
- [ ] Verify authentication working
- [ ] Check Sentry for errors
- [ ] Monitor for 2 hours

#### Post-deployment (24 hours)
- [ ] Monitor error rates (target: < 0.1%)
- [ ] Monitor auth failures (target: < 5%)
- [ ] Monitor rate limits (target: < 1% triggers)
- [ ] Verify response times (p95 < 200ms)
- [ ] Check Sentry dashboard

#### Sign-off
- [ ] No critical errors
- [ ] Performance acceptable
- [ ] Security working as expected
- [ ] Team trained on new system

**Owner:** _______________  
**Go-Live Date:** Dec 22  

---

## 📊 PROGRESS TRACKING

| Phase | Status | Owner | Start | End | % Complete |
|-------|--------|-------|-------|-----|------------|
| 1. Implementation | ✅ Complete | AI Agent | Dec 1 | Dec 1 | 100% |
| 2. Staging | ⏳ Ready | DevOps | Dec 1 | Dec 2 | 0% |
| 3. Auth Decision | ⏳ Pending | Arch | Dec 2 | Dec 5 | 0% |
| 4. Backend TODOs | ⏳ Pending | Backend | Dec 6 | Dec 12 | 0% |
| 5. Security Test | ⏳ Pending | QA | Dec 16 | Dec 19 | 0% |
| 6. Production | ⏳ Pending | DevOps | Dec 22 | Dec 22 | 0% |

**Overall Progress:** 16% (1/6 phases complete)  
**On Track:** Yes ✅  
**Blockers:** None  
**Risk Level:** 🟡 Moderate  

---

## 📞 ESCALATION CONTACTS

**Critical Issues:**
- Security: security@prismaglow.com
- Incidents: Slack #incidents

**Questions:**
- Technical: Slack #engineering
- Deployment: Slack #devops

**Documentation:**
- Start: [SECURITY_AUDIT_HANDOFF_REPORT.md](SECURITY_AUDIT_HANDOFF_REPORT.md)
- Quick: [SECURITY_AUDIT_RESPONSE_QUICK_START.md](SECURITY_AUDIT_RESPONSE_QUICK_START.md)

---

**Last Updated:** 2025-12-01  
**Next Review:** Weekly (every Monday)  
**Status:** ✅ Ready for Team Execution
