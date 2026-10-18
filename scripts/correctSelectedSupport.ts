import path from "node:path";
import { fileURLToPath } from "node:url";
import { correctEditorialIntegrity } from "./correctEditorialIntegrity";
import record from "./fixtures/editorial-selected-support-correction-20261018.json";

export function correctSelectedSupport(rootDir = process.cwd()) {
  return correctEditorialIntegrity(rootDir, record.corrections);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Corrected ${correctSelectedSupport().length} fresh posts; identity, dates, sources and discussion structure preserved.`);
}
