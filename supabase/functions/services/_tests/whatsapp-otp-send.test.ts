import { assertEquals } from "https://deno.land/std/assert/mod.ts";
import { makeEnv } from "../../_shared/testing.ts";

Deno.test("otp send returns 405 for non-POST", async () => {
  makeEnv();
  const mod = await import("../whatsapp/otp-send/index.ts");
  const res = await mod.handler(new Request("http://local/", { method: "GET" }));
  assertEquals(res.status, 405);
});

Deno.test("otp send returns 400 for invalid json", async () => {
  makeEnv();
  const mod = await import("../whatsapp/otp-send/index.ts");
  const res = await mod.handler(new Request("http://local/", { method: "POST", body: "not-json", headers: { "content-type": "application/json" } }));
  assertEquals(res.status, 400);
});

Deno.test("otp send returns 400 for missing fields", async () => {
  makeEnv();
  const mod = await import("../whatsapp/otp-send/index.ts");
  const res = await mod.handler(new Request("http://local/", { method: "POST", body: JSON.stringify({}), headers: { "content-type": "application/json" } }));
  assertEquals(res.status, 400);
});

Deno.test("otp send returns 401 when auth header missing", async () => {
  makeEnv();
  const mod = await import("../whatsapp/otp-send/index.ts");
  const body = { userId: "u1", orgId: "o1", whatsappE164: "+35699112233" };
  const res = await mod.handler(new Request("http://local/", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
  assertEquals(res.status, 401);
});

