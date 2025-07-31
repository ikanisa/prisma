import fs from "fs";
import { Client } from "pg";

(async () => {
  const pg = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await pg.connect();

  const tbls = await pg.query(/*sql*/`
    select relname as table,
           relrowsecurity as rls_enabled
    from pg_class
    join pg_namespace n on n.oid = pg_class.relnamespace
    where n.nspname = 'public'
      and relkind = 'r'
      and relname not like 'pg_%' and relname not like 'sql_%'
      and relname not like 'spatial_ref_sys'
    order by 1;
  `);

  const rows = tbls.rows as {table:string;rls_enabled:boolean}[];

  const missingRls:string[] = [];
  const hasRlsNoPolicy:string[] = [];
  const policies:{[t:string]:string[]} = {};

  for (const row of rows) {
    if (!row.rls_enabled) missingRls.push(row.table);
    
    const pols = await pg.query(/*sql*/`
      select policyname from pg_policies 
      where tablename = $1 and schemaname = 'public'
    `, [row.table]);
    
    if (row.rls_enabled && pols.rows.length === 0) {
      hasRlsNoPolicy.push(row.table);
    }
    
    policies[row.table] = pols.rows.map(r => r.policyname);
  }

  const audit = {
    missingRls,
    hasRlsNoPolicy,
    policies,
    totalTables: rows.length
  };

  fs.writeFileSync("/tmp/rls-audit.json", JSON.stringify(audit, null, 2));
  console.log("✅  /tmp/rls-audit.json written");
  
  await pg.end();
})().catch(console.error);