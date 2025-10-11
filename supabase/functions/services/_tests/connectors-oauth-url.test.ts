import { assert, assertEquals } from "https://deno.land/std/assert/mod.ts";

Deno.test("connectors oauth-url returns a URL with provider", async () => {
  const mod = await import("../connectors/oauth-url/index.ts");
  const req = new Request("http://localhost/services/connectors/oauth-url?provider=google");
  const res = await mod.handler(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assert(typeof body.url === "string");
  assert(body.url.includes("provider=google"));
});

