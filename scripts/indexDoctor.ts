import { Client } from "pg";
import fs from "fs";

(async () => {
  const THRESHOLD = 0.30;          // 30 % cost cut
  const MAX_CANDIDATES = 6;        // limit per query
  const TOP_QUERIES = 50;          // analyse 50 hottest

  const pg = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await pg.connect();

  // 1) ensure hypopg exists
  await pg.query("create extension if not exists hypopg");

  // 2) grab hottest queries (SELECT only)
  const hot = await pg.query(/*sql*/`
    select query, total_exec_time, mean_exec_time, calls
    from pg_stat_statements
    where query ilike 'select%'
    order by total_exec_time desc
    limit $1;
  `,[TOP_QUERIES]);

  type Suggestion = {ddl:string, benefit:number};

  const suggestions:Suggestion[] = [];

  /**
   * naive regexp: find FROM public.table ...
   * then propose btree on every WHERE column or join column
   */
  function guessCandidateIndexes(sql:string):string[]{
    const m = /from\s+public\.([a-zA-Z0-9_]+)/i.exec(sql);
    if(!m) return [];
    const tbl = m[1];
    // collect columns after WHERE or JOIN ... ON
    const cols = [...sql.matchAll(/\b([a-z0-9_]+)\s*=\s*/gi)]
                   .map(x=>x[1])
                   .filter(c=>!['and','or'].includes(c.toLowerCase()));
    // dedupe + single-col only
    return [...new Set(cols)].slice(0,MAX_CANDIDATES)
      .map(c=>`create index on public.${tbl} (${c});`);
  }

  // 3) test each candidate with hypopg
  for(const row of hot.rows){
    const sql = row.query as string;
    for(const ddl of guessCandidateIndexes(sql)){
      await pg.query("select hypopg_reset();");   // clear older hypotheticals
      const hyp = await pg.query(`select * from hypopg_create_index($1);`,[ddl]);
      if(!hyp.rows[0]) continue;
      const before = await pg.query(`explain (format json) ${sql}`);
      const after  = await pg.query(`explain (format json) ${sql}`);
      const costBefore = before.rows[0]["QUERY PLAN"][0].Plan.TotalCost;
      const costAfter  =  after.rows[0]["QUERY PLAN"][0].Plan.TotalCost;
      const benefit = (costBefore-costAfter)/costBefore;
      if(benefit >= THRESHOLD){
        suggestions.push({ddl: ddl.replace("create index","create index concurrently if not exists"), benefit});
      }
    }
  }

  await pg.end();

  // 4) write out results
  const idxSql = suggestions
   .map(s=>`-- ${Math.round(s.benefit*100)} % faster\n${s.ddl}`)
   .join("\n\n");

  fs.writeFileSync("/tmp/index-doctor.sql", idxSql || "-- no useful indexes found");

  let md = `# IDX-Doctor report\n\nAnalysed ${hot.rowCount} hottest queries · threshold ${THRESHOLD*100}%\n\n`;
  if(suggestions.length) {
    md += `## Proposed indexes (${suggestions.length})\n`;
    suggestions.forEach(s=>{
      md += `* **${Math.round(s.benefit*100)} %** · \`${s.ddl}\`\n`;
    });
  } else {
    md += "No high-impact indexes missing 🎉";
  }
  fs.writeFileSync("/tmp/index-doctor.md", md);

  console.log("✅  /tmp/index-doctor.sql and .md generated");
})();