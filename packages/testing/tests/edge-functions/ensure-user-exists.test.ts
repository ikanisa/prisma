import { handler } from "../../../../supabase/functions/ensure-user-exists/index.ts";

describe("ensure-user-exists Edge Function", () => {
  it("upserts and returns success on POST", async () => {
    const req = new Request("https://test", {
      method: "POST",
      body: JSON.stringify({ phone_number: "1234" }),
    });
    const resp = await handler(req);
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.success).toBe(true);
  });

  it("rejects non-POST requests", async () => {
    const resp = await handler(new Request("https://test", { method: "GET" }));
    expect(resp.status).toBe(405);
  });
});
