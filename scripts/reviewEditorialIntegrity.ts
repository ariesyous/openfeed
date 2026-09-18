import { reviewIntegrityBenchmark } from "../generator/editorial/integrityBenchmark";

// Offline diagnostic only: no providers, source fetches, data writes or publication.
const rows = reviewIntegrityBenchmark();
console.log("Editorial integrity benchmark — reviewed expectations, not a semantic model score.\n");
for (const row of rows) {
  console.log(`${row.id}: editorial=${row.expectedEditorialDecision}; deterministic gate=${row.deterministicGate}`);
  console.log(`  ${row.reviewReason}`);
  if (row.issues.length) console.log(`  Gate: ${row.issues.join("; ")}`);
}
const semanticGaps = rows.filter(row => row.expectedEditorialDecision === "reject" && row.deterministicGate.startsWith("passes"));
console.log(`\n${semanticGaps.length} reviewed counterexamples pass deterministic gates. Do not treat citation validity as factual approval.`);
