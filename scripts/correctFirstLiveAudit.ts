import path from "node:path";
import { fileURLToPath } from "node:url";
import { correctEditorialIntegrity } from "./correctEditorialIntegrity";
import record from "./fixtures/editorial-first-live-corrections-20260918.json";

export function correctFirstLiveAudit(rootDir = process.cwd()) {
  return correctEditorialIntegrity(rootDir, record.corrections);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const changed = correctFirstLiveAudit();
  console.log(changed.length
    ? `Corrected ${changed.length} reviewed posts; identity and publication dates preserved.`
    : "First live-audit corrections are already applied; no files changed.");
}
