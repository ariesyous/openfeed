import { describe, expect, it } from "vitest";
import { INTEGRITY_EXAMPLES, reviewIntegrityBenchmark } from "../editorial/integrityBenchmark";

describe("reviewed editorial integrity examples", () => {
  it("preserves supported attribution, uncertainty, commentary and corrected factual examples", () => {
    const results = reviewIntegrityBenchmark();
    expect(INTEGRITY_EXAMPLES).toHaveLength(16);
    expect(new Set(results.map(result => result.id)).size).toBe(16);
    for (const result of results.filter(row => row.expectedEditorialDecision === "accept")) {
      expect(result.issues, result.id).toEqual([]);
      expect(result.deterministicGate).toContain("semantic review still required");
    }
  });

  it("rejects process narration and a fabricated second quotation without hiding the reasons", () => {
    const results = reviewIntegrityBenchmark();
    for (const example of INTEGRITY_EXAMPLES.filter(row => row.deterministicRejection)) {
      const result = results.find(row => row.id === example.id)!;
      expect(result.deterministicGate, example.id).toBe("rejects");
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it("reports semantic judgments separately from executable publication gates", () => {
    const results = reviewIntegrityBenchmark();
    for (const id of ["comet-entity-wrong", "crater-scope-wrong", "family-relationship-wrong", "discussion-background-wrong", "live-unrelated-source-wrong", "live-speaker-attribution-wrong"]) {
      const result = results.find(row => row.id === id)!;
      expect(result.expectedEditorialDecision).toBe("reject");
      // Deliberately do not demand that these pass the validator: later semantic
      // safeguards may improve it. When they do pass, the result must not say safe.
      if (!result.issues.length) expect(result.deterministicGate).toBe("passes; semantic review still required");
      expect(result.reviewReason.length).toBeGreaterThan(30);
    }
  });
});
