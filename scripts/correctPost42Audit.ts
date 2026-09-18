import path from "node:path";
import { fileURLToPath } from "node:url";
import { correctEditorialIntegrity } from "./correctEditorialIntegrity";
import record from "./fixtures/editorial-post42-corrections-20260918.json";

export function correctPost42Audit(rootDir = process.cwd()) {
  return correctEditorialIntegrity(rootDir, record.corrections);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const changed = correctPost42Audit();
  console.log(changed.length
    ? `Corrected ${changed.length} reviewed posts; identity and publication dates preserved.`
    : "Post-42 audit corrections are already applied; no files changed.");
}
