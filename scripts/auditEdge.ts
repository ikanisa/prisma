import { execSync } from "child_process";
import fs from "fs";

// --- get edge functions --------------------------------------------------
const raw = execSync("supabase functions list", { encoding: "utf8" });
// Parse table output: skip header lines, extract NAME column
const lines = raw.split("\n").filter(l => l.trim() && !l.startsWith("ID ") && !l.startsWith("-"));
const names = lines.map(l => l.split("|")[2]?.trim()).filter(Boolean);

const canonical: any = {};
const dupes: string[] = [];

for (const name of names) {
  const base = name
    .replace(/[_-](v?\d+)$/i, "")              // strip versions
    .replace(/[_-](webhook|handler|router)$/, "");
  if (canonical[base]) dupes.push(name);
  else canonical[base] = name;
}

fs.writeFileSync("/tmp/edge-audit.json", JSON.stringify({ canonical, dupes }, null, 2));
console.log("✅  /tmp/edge-audit.json written");