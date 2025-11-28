# 🚀 TRACK 3 QUICK COMMANDS
## Copy-paste commands for rapid execution

## Task 1: Virtual Components

### 1.1 Test virtual scrolling with 1000 items
```bash
# Build project
pnpm run build

# Run dev server
pnpm run dev

# In browser console, generate test data:
# (paste in browser dev tools console on documents page)
const testDocs = Array.from({ length: 1000 }, (_, i) => ({
  id: `doc-${i}`,
  title: `Document ${i}`,
  status: ['draft', 'review', 'approved'][i % 3],
  size: Math.random() * 1000000,
  created_at: new Date().toISOString()
}));
```

### 1.2 Measure scrolling performance
```javascript
// In browser console
let lastTime = performance.now();
let frames = 0;
function measureFPS() {
  frames++;
  const now = performance.now();
  if (now >= lastTime + 1000) {
    console.log('FPS:', frames);
    frames = 0;
    lastTime = now;
  }
  requestAnimationFrame(measureFPS);
}
measureFPS();
// Scroll rapidly and check FPS stays above 55
```

## Task 2: Caching

### 2.1 Test Redis connection
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start Redis:
brew services start redis  # macOS
# OR
sudo systemctl start redis  # Linux
```

### 2.2 Monitor cache performance
```bash
# Watch cache metrics
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses

# Calculate hit rate:
# hit_rate = hits / (hits + misses)
```

## Task 3: Code Splitting

### 3.1 Analyze bundle size
```bash
# Build with analysis
pnpm run build

# Check bundle sizes
ls -lh dist/assets/*.js | awk '{print $5, $9}'

# Should see:
# - index-[hash].js < 300KB (main bundle)
# - [route]-[hash].js 30-120KB each (route chunks)
```

## Task 4: Testing

### 4.1 Run all tests
```bash
# Typecheck
pnpm run typecheck

# Lint
pnpm run lint

# Unit tests
pnpm run test

# Coverage
pnpm run coverage

# Should show >80% coverage
```

### 4.2 Lighthouse audit
```bash
# Install Lighthouse CLI (if needed)
npm install -g lighthouse

# Run audit on dev server
pnpm run dev &
sleep 5
lighthouse http://localhost:5173 --output html --output-path ./lighthouse-report.html

# Open report
open lighthouse-report.html  # macOS
# OR
xdg-open lighthouse-report.html  # Linux
```

### 4.3 Accessibility testing
```bash
# Run axe-core tests
pnpm run test:a11y

# Manual keyboard test:
# 1. Tab through all interactive elements
# 2. Verify focus visible on all
# 3. Test Esc key dismisses modals
# 4. Test Cmd+K opens command palette
```

## Task 5: Staging Deployment

### 5.1 Pre-deployment checks
```bash
# Ensure all committed
git status

# Run full verification
pnpm run ci:verify

# Build production bundle
NODE_ENV=production pnpm run build

# Check bundle size
du -sh dist/
# Should be <2MB total
```

### 5.2 Deploy to staging
```bash
# Push to staging branch
git push origin feature/track-3-completion:staging

# Monitor deployment (if using Netlify/Vercel)
# Check deployment dashboard
```

## Task 6: Production Deployment

### 6.1 Database backup
```bash
# Backup production database (if applicable)
pg_dump "$PRODUCTION_DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup created
ls -lh backup_*.sql | tail -1
```

### 6.2 Deploy to production
```bash
# Merge to main
git checkout main
git merge feature/track-3-completion
git push origin main

# Tag release
git tag -a v1.0.0-track3-complete -m "Track 3 completion: 95/100 readiness"
git push origin v1.0.0-track3-complete
```

### 6.3 Post-deploy monitoring
```bash
# Watch production logs
# (adjust command for your hosting)
heroku logs --tail  # Heroku
# OR
kubectl logs -f deployment/prisma-glow  # Kubernetes
# OR
docker-compose logs -f  # Docker Compose

# Monitor metrics
curl https://your-domain.com/api/health
curl https://your-domain.com/api/health/cache
curl https://your-domain.com/api/health/db
```

## Quick Health Checks

### Frontend health
```bash
curl http://localhost:5173
# Should return HTML

# Check bundle
curl -I http://localhost:5173/assets/index-*.js
# Should show Content-Length < 300KB
```

### Backend health
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}

curl http://localhost:8000/health/cache
# Should return cache metrics with hit_rate > 0.8
```

### Database health
```bash
# Check connection
psql "$DATABASE_URL" -c "SELECT 1;"
# Should return: 1

# Check tables
psql "$DATABASE_URL" -c "\dt"
# Should list all tables
```

## Rollback Commands (if needed)

### Rollback staging
```bash
git push origin main:staging --force
```

### Rollback production
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# OR revert to specific tag
git reset --hard v0.9.0
git push origin main --force
```

### Rollback database
```bash
psql "$PRODUCTION_DATABASE_URL" < backup_20251128_*.sql
```

---

**Save this file for quick reference during execution!**
