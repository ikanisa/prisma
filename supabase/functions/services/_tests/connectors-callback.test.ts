import { assertEquals } from "https://deno.land/std/assert/mod.ts";
import { getToken } from "../token-vault.ts";

Deno.test("connectors callback returns 400 when code missing", async () => {
  const mod = await import("../connectors/callback/index.ts");
  const res = await mod.handler(new Request("http://localhost/services/connectors/callback?provider=mock&org_id=org1"));
  assertEquals(res.status, 400);
});

Deno.test("connectors callback stores token and returns 200", async () => {
  const mod = await import("../connectors/callback/index.ts");
  const res = await mod.handler(new Request("http://localhost/services/connectors/callback?provider=mock&org_id=org1&code=abc"));
  assertEquals(res.status, 200);
  const token = await getToken("mock", "org1");
  assertEquals(token, "token-abc");
});

