import { handler } from "../../../../supabase/functions/wa-router/index.ts";

describe("wa-router Edge Function", () => {
  it("responds to GET verification", async () => {
    process.env.WHATSAPP_TOKEN = "tok";
    const url = "https://test?hub.mode=subscribe&hub.verify_token=tok&hub.challenge=abc";
    const resp = await handler(new Request(url, { method: "GET" }));
    expect(resp.status).toBe(200);
    expect(await resp.text()).toBe("abc");
  });

  it("rejects invalid methods", async () => {
    const resp = await handler(new Request("https://test", { method: "PUT" }));
    expect(resp.status).toBe(403);
  });
});
