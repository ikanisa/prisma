import { describe, it, expect } from "vitest";
import { computeWithholdingTaxTool } from "../src/tools/compute-withholding-tax-tool.js";

describe("computeWithholdingTaxTool", () => {
  it("computes RW withholding tax with default rate", async () => {
    const result = await computeWithholdingTaxTool.execute({
      jurisdiction: "RW",
      paymentType: "dividends",
      grossAmount: 10000,
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.manifestHash).toBeDefined();
  });

  it("rejects when domestic rate missing", async () => {
    const result = await computeWithholdingTaxTool.execute({
      jurisdiction: "CA",
      paymentType: "interest",
      grossAmount: 5000,
    });

    expect(result.success).toBe(false);
  });
});
