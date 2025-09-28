/* eslint-env node */
// Collection of tools used by agent routes

export async function vector_search(_query: string) {
  // stubbed vector search returning empty results
  return [] as unknown[];
}

export async function sql_readonly(_sql: string) {
  // pretend to execute read-only SQL
  return [] as unknown[];
}

export function materiality(amounts: number[]) {
  const total = amounts.reduce((a, b) => a + b, 0);
  return total * 0.05; // simple 5% threshold
}

export function mus_sampling<T>(items: T[], sampleSize: number) {
  return items.slice(0, sampleSize);
}

interface VatRule { country: string; rate: number; }
const vat_rules: VatRule[] = [
  { country: "UK", rate: 0.2 },
  { country: "DE", rate: 0.19 },
  { country: "FR", rate: 0.2 },
];

export function vat_determine(country: string) {
  return vat_rules.find((r) => r.country === country)?.rate ?? null;
}

// Google Drive/Sheets helper stubs
export async function driveUpload(_file: unknown) {
  throw new Error("driveUpload not implemented");
}

export async function sheetAppend(_sheet: unknown, _values: unknown[]) {
  throw new Error("sheetAppend not implemented");
}
