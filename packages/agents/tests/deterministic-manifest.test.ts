import { describe, it, expect } from "vitest";
import {
  createDeterministicManifest,
  validateDeterministicManifest,
} from "../src/tools/deterministic-manifest.js";

describe("deterministic manifest", () => {
  it("creates and validates a manifest", () => {
    const manifest = createDeterministicManifest({
      tool: "compute_vat_return",
      inputs: { a: 1, b: 2 },
      outputs: { total: 3 },
      evidenceIds: ["doc-1"],
    });

    const validation = validateDeterministicManifest(manifest);

    expect(validation.valid).toBe(true);
    expect(manifest.hash).toBeDefined();
  });

  it("detects hash mismatch", () => {
    const manifest = createDeterministicManifest({
      tool: "compute_vat_return",
      inputs: { a: 1 },
      outputs: { total: 1 },
    });

    const tampered = { ...manifest, outputs: { total: 2 } };
    const validation = validateDeterministicManifest(tampered);

    expect(validation.valid).toBe(false);
    expect(validation.reason).toBe("hash_mismatch");
  });
});
