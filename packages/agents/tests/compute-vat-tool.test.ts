import { describe, it, expect } from "vitest";
import { computeVatReturnTool } from "../src/tools/compute-vat-tool.js";

describe("computeVatReturnTool", () => {
  it("returns manifest metadata for deterministic computation", async () => {
    const result = await computeVatReturnTool.execute({
      jurisdiction: "MT",
      period: { start: "2024-01-01", end: "2024-01-31" },
      sales: [
        {
          description: "Consulting",
          grossAmount: 1180,
          vatRate: 0.18,
        },
      ],
      purchases: [
        {
          description: "Office supplies",
          grossAmount: 590,
          vatRate: 0.18,
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.manifest).toBeDefined();
    expect(result.metadata?.manifestHash).toBeDefined();
  });

  it("rejects invalid payloads", async () => {
    const result = await computeVatReturnTool.execute({
      jurisdiction: "MT",
      period: { start: "2024-01-01", end: "2024-01-31" },
    });

    expect(result.success).toBe(false);
  });
});
