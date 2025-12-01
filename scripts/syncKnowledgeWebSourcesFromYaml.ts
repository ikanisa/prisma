import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { createClient } from "@supabase/supabase-js";

const ENV_FILES = [".env.local", ".env"];
const YAML_PATH = path.resolve("config/knowledge_web_sources.yaml");
const BATCH_SIZE = 50;

const VALID_AUTHORITY_LEVELS = new Set(["PRIMARY", "SECONDARY", "INTERNAL"]);
const VALID_STATUS = new Set(["ACTIVE", "INACTIVE"]);

function loadEnvFiles() {
  for (const file of ENV_FILES) {
    const envPath = path.resolve(file);
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();

      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFiles();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type YamlSource = {
  name: string;
  url: string;
  domain?: string;
  category: string;
  jurisdiction_code?: string;
  authority_level?: "PRIMARY" | "SECONDARY" | "INTERNAL";
  status?: "ACTIVE" | "INACTIVE";
  priority?: number;
  tags?: string[];
  notes?: string;
};

type YamlFile = {
  version: number;
  sources: YamlSource[];
};

function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    throw new Error(`Invalid URL "${url}" in YAML file`);
  }
}

function normalizeSource(source: YamlSource, index: number) {
  if (!source.name || !source.url || !source.category) {
    throw new Error(`Source at position ${index + 1} is missing name/url/category`);
  }

  const authority = VALID_AUTHORITY_LEVELS.has(source.authority_level ?? "")
    ? source.authority_level!
    : "SECONDARY";
  const status = VALID_STATUS.has(source.status ?? "")
    ? source.status!
    : "ACTIVE";

  return {
    name: source.name,
    url: source.url,
    domain: source.domain || getDomainFromUrl(source.url),
    category: source.category,
    jurisdiction_code: source.jurisdiction_code || "GLOBAL",
    authority_level: authority,
    status,
    priority: source.priority ?? 3,
    tags: Array.isArray(source.tags) ? source.tags : [],
    notes: source.notes ?? null,
    updated_at: new Date().toISOString()
  };
}

type NormalizedSource = ReturnType<typeof normalizeSource>;

async function upsertInBatches(rows: NormalizedSource[]) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const start = i + 1;
    const end = i + batch.length;

    console.log(`Upserting rows ${start}-${end} of ${rows.length} ...`);

    const { error } = await supabase
      .from("knowledge_web_sources")
      .upsert(batch, { onConflict: "url" });

    if (error) {
      throw new Error(`Error upserting batch ${start}-${end}: ${error.message}`);
    }
  }
}

async function main() {
  if (!fs.existsSync(YAML_PATH)) {
    console.error(`YAML file not found at ${YAML_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(YAML_PATH, "utf8");
  const parsed = yaml.load(fileContent) as YamlFile | undefined;

  if (!parsed || !Array.isArray(parsed.sources)) {
    console.error("Invalid YAML structure: expected { version, sources: [] }");
    process.exit(1);
  }

  console.log(`Loaded ${parsed.sources.length} sources from YAML (version ${parsed.version ?? "unknown"})`);

  const normalized = parsed.sources.map((source, index) => normalizeSource(source, index));
  await upsertInBatches(normalized);

  console.log("Sync completed successfully ✅");
}

main().catch((error) => {
  console.error("Fatal error during sync:", error);
  process.exit(1);
});
