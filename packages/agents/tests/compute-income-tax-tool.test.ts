import { describe, it, expect } from "vitest";
import { computeIncomeTaxTool } from "../src/tools/compute-income-tax-tool.js";

describe("computeIncomeTaxTool", () => {
  it("computes RW income tax with default rate", async () => {
    const result = await computeIncomeTaxTool.execute({
      jurisdiction: "RW",
      taxYear: 2024,
      taxableIncome: 100000,
      adjustments: [{ description: "Non-deductible", amount: 5000, type: "add" }],
    });

    expect(result.success).toBe(true);
    expect(result.metadata?.manifestHash).toBeDefined();
  });

  it("requires override for CA", async () => {
    const result = await computeIncomeTaxTool.execute({
      jurisdiction: "CA",
      taxYear: 2024,
      taxableIncome: 50000,
    });

    expect(result.success).toBe(false);
  });
});
