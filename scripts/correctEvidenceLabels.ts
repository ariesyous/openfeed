import path from "node:path";
import { fileURLToPath } from "node:url";
import { correctEditorialIntegrity } from "./correctEditorialIntegrity";
import record from "./fixtures/editorial-label-corrections-20261018.json";

export function correctEvidenceLabels(rootDir = process.cwd()) {
  return correctEditorialIntegrity(rootDir, record.corrections);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Corrected ${correctEvidenceLabels().length} reviewed bodies; identity, dates and discussions preserved.`);
}
