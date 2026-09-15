import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.join(HERE, "prompts");

const templateCache = new Map<string, string>();

export function loadTemplate(relPath: string): string {
  const cached = templateCache.get(relPath);
  if (cached !== undefined) return cached;
  const content = readFileSync(path.join(PROMPTS_DIR, relPath), "utf8");
  templateCache.set(relPath, content);
  return content;
}

/** Replaces every {{KEY}} occurrence in the template. Throws if a token has no matching
 * value -- a missing prompt variable should fail loudly, not silently render as literal
 * "{{KEY}}" text sent to the model. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (!(key in vars)) {
      throw new Error(`promptBuilder: no value provided for template token {{${key}}}`);
    }
    return vars[key];
  });
}

export function buildSystemPrompt(): string {
  return renderTemplate(loadTemplate("system.md"), {});
}

export function buildBootstrapPrompt(vars: {
  minAccounts: string;
  maxAccounts: string;
  communityExamples: string;
}): string {
  return renderTemplate(loadTemplate("bootstrap.md"), {
    MIN_ACCOUNTS: vars.minAccounts,
    MAX_ACCOUNTS: vars.maxAccounts,
    COMMUNITY_EXAMPLES: vars.communityExamples,
  });
}

export function buildAdvanceWorldPrompt(vars: {
  worldStateJson: string;
  accountsSummary: string;
  itemsPerCycle: string;
  commentsMin: string;
  commentsMax: string;
}): string {
  return renderTemplate(loadTemplate("advance-world.md"), {
    WORLD_STATE_JSON: vars.worldStateJson,
    ACCOUNTS_SUMMARY: vars.accountsSummary,
    ITEMS_PER_CYCLE: vars.itemsPerCycle,
    COMMENTS_MIN: vars.commentsMin,
    COMMENTS_MAX: vars.commentsMax,
  });
}
