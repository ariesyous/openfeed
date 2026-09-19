import path from "node:path";
import { fileURLToPath } from "node:url";
import { correctEditorialIntegrity } from "./correctEditorialIntegrity";
import record from "./fixtures/editorial-scheduled-corrections-20260919.json";

export function correctScheduledAudit(rootDir = process.cwd()) {
  return correctEditorialIntegrity(rootDir, record.corrections);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const changed = correctScheduledAudit();
  console.log(changed.length
    ? `Corrected ${changed.length} reviewed posts; identity and publication dates preserved.`
    : "Scheduled audit corrections are already applied; no files changed.");
}
