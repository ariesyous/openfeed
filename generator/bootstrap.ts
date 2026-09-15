import type { Account } from "../schemas";
import {
  BOOTSTRAP_MAX_ACCOUNTS,
  BOOTSTRAP_MAX_TOKENS,
  BOOTSTRAP_MIN_ACCOUNTS,
  BOOTSTRAP_TIMEOUT_MS,
} from "./config";
import { enrichBootstrap } from "./enrich";
import { buildBootstrapPrompt, buildSystemPrompt } from "./promptBuilder";
import {
  RawBootstrapResponseSchema,
  validateRawBootstrapReferences,
  type RawBootstrapResponse,
} from "./rawSchemas";
import { generateValidated, type ParseOutcome } from "./retry";
import { buildInitialWorldState, type WorldState } from "./worldState";

// Loosely follows ProjectSpecifications.md §7's example categories -- the model is
// explicitly told it can invent its own too, this is just a starting nudge.
const COMMUNITY_EXAMPLES =
  "technology, gaming, relationships, work, local/community chatter, entertainment, " +
  "hobbies, weird internet culture, science, unpopular opinions, absurd humor";

function parseRawBootstrap(json: unknown): ParseOutcome<RawBootstrapResponse> {
  const result = RawBootstrapResponseSchema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    };
  }
  const crossRefIssues = validateRawBootstrapReferences(result.data);
  if (crossRefIssues.length > 0) {
    return { ok: false, issues: crossRefIssues };
  }
  return { ok: true, value: result.data };
}

export interface RunBootstrapResult {
  accounts: Account[];
  world: WorldState;
  idByHandle: Map<string, string>;
  modelUsed: string;
  attempts: number;
}

/** Runs the one-time bootstrap: invents the initial account population and world state.
 * Goes through the same validation/retry protections as a normal cycle (§25). */
export async function runBootstrap(ctx: {
  apiKey: string;
  runId: string;
  now: Date;
  onAttempt?: (info: { attempt: number; outcomeKind: string; detail?: string }) => void;
  fetchImpl?: typeof fetch;
}): Promise<RunBootstrapResult> {
  const systemPrompt = buildSystemPrompt();
  const initialUserPrompt = buildBootstrapPrompt({
    minAccounts: String(BOOTSTRAP_MIN_ACCOUNTS),
    maxAccounts: String(BOOTSTRAP_MAX_ACCOUNTS),
    communityExamples: COMMUNITY_EXAMPLES,
  });

  const result = await generateValidated<RawBootstrapResponse>({
    apiKey: ctx.apiKey,
    systemPrompt,
    initialUserPrompt,
    // No response_format/jsonSchema here on purpose: live testing against openrouter/free
    // showed strict structured-output mode on a schema this large (30-50 nested account
    // objects) reliably comes back empty or truncated on whichever free model gets
    // picked. The prompt already spells out the exact JSON shape with a literal example,
    // and Zod validation + the retry-with-correction loop below carry the rest.
    maxTokens: BOOTSTRAP_MAX_TOKENS,
    timeoutMs: BOOTSTRAP_TIMEOUT_MS,
    parse: parseRawBootstrap,
    onAttempt: ctx.onAttempt,
    fetchImpl: ctx.fetchImpl,
  });

  const { accounts, idByHandle } = enrichBootstrap(result.value, {
    runId: ctx.runId,
    now: ctx.now,
  });

  const world = buildInitialWorldState({
    now: ctx.now,
    communities: result.value.communities,
    accounts,
    initialStorylines: (result.value.initialStorylines ?? []).map((s) => ({
      title: s.title,
      summary: s.summary,
      involvedAccountIds: s.involvedHandles
        .map((h) => idByHandle.get(h))
        .filter((id): id is string => !!id),
    })),
  });

  return { accounts, world, idByHandle, modelUsed: result.modelUsed, attempts: result.attempts };
}
