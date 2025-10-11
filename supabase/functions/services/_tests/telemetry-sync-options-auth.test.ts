import { assertEquals } from "https://deno.land/std/assert/mod.ts";

Deno.test("telemetry-sync handles OPTIONS preflight", async () => {
  const mod = await import("../../telemetry-sync/index.ts");
  const res = await mod.handler(new Request("http://localhost/functions/v1/telemetry-sync", { method: "OPTIONS" }));
  assertEquals(res.status, 200);
  // CORS headers present
  assertEquals(res.headers.get('Access-Control-Allow-Methods')?.includes('POST') ?? false, true);
});

Deno.test("telemetry-sync returns 401 when Authorization missing", async () => {
  const mod = await import("../../telemetry-sync/index.ts");
  const res = await mod.handler(new Request("http://localhost/functions/v1/telemetry-sync", { method: "POST", body: JSON.stringify({ orgSlug: 'acme' }) }));
  assertEquals(res.status, 401);
});

