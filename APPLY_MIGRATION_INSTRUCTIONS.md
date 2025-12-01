# How to Apply the Knowledge Web Sources Migration

## ✅ Recommended Method: Supabase Studio SQL Editor

Since the Supabase CLI has migration history conflicts, the easiest way is to apply the migration manually via Supabase Studio.

### Step-by-Step Instructions

1. **Open Supabase Studio**
   - Go to: https://supabase.com/dashboard/project/rcocfusrqrornukrnkln
   - Navigate to: SQL Editor

2. **Copy the Migration SQL**
   - Open file: `supabase/migrations/20251201_knowledge_web_sources_200_urls.sql`
   - Copy the entire contents (Cmd+A, Cmd+C)

3. **Paste and Execute**
   - Paste the SQL into the Supabase SQL Editor
   - Click "Run" button
   - Wait for execution to complete (~5-10 seconds)

4. **Verify Success**
   Run this query in the SQL Editor:
   ```sql
   SELECT COUNT(*) FROM knowledge_web_sources;
   ```
   Expected result: **200**

5. **Check Table Structure**
   ```sql
   \d knowledge_web_sources
   ```
   Or:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'knowledge_web_sources'
   ORDER BY ordinal_position;
   ```

6. **Sample Query**
   ```sql
   SELECT category, COUNT(*) 
   FROM knowledge_web_sources 
   GROUP BY category 
   ORDER BY COUNT(*) DESC;
   ```

---

## Alternative Method: Direct psql Connection

If you have direct database access:

1. **Get Connection String**
   - In Supabase Studio → Project Settings → Database
   - Copy the "Connection string" (with pooler)
   - Format: `postgresql://postgres.[project-id]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

2. **Apply Migration**
   ```bash
   psql "your-connection-string-here" -f supabase/migrations/20251201_knowledge_web_sources_200_urls.sql
   ```

3. **Verify**
   ```bash
   psql "your-connection-string-here" -c "SELECT COUNT(*) FROM knowledge_web_sources;"
   ```

---

## Alternative Method: Repair Migration History & Push

If you want to sync the CLI migration history:

1. **Mark All Migrations as Applied**
   ```bash
   # Run all these repair commands to sync local with remote
   supabase migration repair --status applied 20251201
   ```

2. **Then Push**
   ```bash
   supabase db push
   ```

However, this is more complex and may cause issues. **We recommend the Supabase Studio method above.**

---

## Verification Checklist

After applying the migration, verify:

- [ ] Table exists: `SELECT * FROM knowledge_web_sources LIMIT 1;`
- [ ] 200 rows: `SELECT COUNT(*) FROM knowledge_web_sources;`
- [ ] Indexes exist: `SELECT indexname FROM pg_indexes WHERE tablename = 'knowledge_web_sources';`
- [ ] Categories: `SELECT DISTINCT category FROM knowledge_web_sources;`
- [ ] Jurisdictions: `SELECT DISTINCT jurisdiction_code FROM knowledge_web_sources;`

---

## Next Steps After Migration

1. **Use in TypeScript**
   ```typescript
   import { getActiveDomains } from '@/packages/lib/src/knowledge-web-sources';
   const domains = await getActiveDomains(supabase);
   ```

2. **Build Admin Panel**
   - List sources with filters
   - Toggle ACTIVE/INACTIVE
   - Add/edit sources

3. **Integrate with DeepSearch**
   - Query domains dynamically
   - Filter by category/jurisdiction

4. **Configure Crawler**
   - Use `getSourcesNeedingCrawl()`
   - Update `last_crawled_at`

---

## Troubleshooting

**Q: "relation knowledge_web_sources already exists"**
- Table was already created. Check if it has 200 rows.
- If it has fewer rows, you can truncate and re-run the inserts:
  ```sql
  TRUNCATE knowledge_web_sources;
  -- Then paste only the INSERT statements
  ```

**Q: Migration fails partway through**
- Check for specific error message
- May need to drop constraints/indexes first
- Or drop the entire table and re-run: `DROP TABLE knowledge_web_sources CASCADE;`

**Q: Can't connect to database**
- Verify your Supabase project is active
- Check project settings for connection details
- Ensure you have database access permissions

---

**Migration File**: `supabase/migrations/20251201_knowledge_web_sources_200_urls.sql` (33KB)
**Expected Result**: 200 rows in `knowledge_web_sources` table
**Documentation**: See `README_KNOWLEDGE_WEB_SOURCES.md` and `docs/KNOWLEDGE_WEB_SOURCES_GUIDE.md`
