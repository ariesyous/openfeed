import type { Account, FeedItem } from "../schemas";
import {
  ADVANCE_WORLD_MAX_TOKENS,
  ADVANCE_WORLD_TIMEOUT_MS,
  COMMENTS_MAX_PER_CYCLE,
  COMMENTS_MIN_PER_CYCLE,
  ITEMS_PER_CYCLE,
} from "./config";
import { createRunRng } from "./engagement";
import { enrichAdvanceWorld, summarizeAccountsForPrompt } from "./enrich";
import { buildAdvanceWorldPrompt, buildSystemPrompt } from "./promptBuilder";
import {
  RawAdvanceWorldResponseSchema,
  checkCycleSizeWarnings,
  validateRawAdvanceWorldReferences,
  type RawAdvanceWorldResponse,
} from "./rawSchemas";
import { generateValidated, type ParseOutcome } from "./retry";
import {
  WorldStateSchema,
  mergeWorldStateUpdate,
  summarizeWorldStateForPrompt,
  type WorldState,
} from "./worldState";

function parseRawAdvanceWorld(
  knownHandles: ReadonlySet<string>,
): (json: unknown) => ParseOutcome<RawAdvanceWorldResponse> {
  return (json) => {
    const result = RawAdvanceWorldResponseSchema.safeParse(json);
    if (!result.success) {
      return {
        ok: false,
        issues: result.error.issues.map(
          (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
        ),
      };
    }
    const crossRefIssues = validateRawAdvanceWorldReferences(result.data, knownHandles);
    if (crossRefIssues.length > 0) {
      return { ok: false, issues: crossRefIssues };
    }
    return { ok: true, value: result.data };
  };
}

export interface RunAdvanceWorldResult {
  items: FeedItem[];
  nextWorld: WorldState;
  modelUsed: string;
  attempts: number;
}

/** Runs one normal generation cycle against an already-initialized world. */
export async function runAdvanceWorld(ctx: {
  apiKey: string;
  runId: string;
  now: Date;
  accounts: Account[];
  world: WorldState;
  idByHandle: Map<string, string>;
  onAttempt?: (info: { attempt: number; outcomeKind: string; detail?: string }) => void;
  onWarnings?: (warnings: string[]) => void;
  fetchImpl?: typeof fetch;
}): Promise<RunAdvanceWorldResult> {
  const systemPrompt = buildSystemPrompt();
  const initialUserPrompt = buildAdvanceWorldPrompt({
    worldStateJson: summarizeWorldStateForPrompt(ctx.world),
    accountsSummary: summarizeAccountsForPrompt(ctx.accounts),
    itemsPerCycle: String(ITEMS_PER_CYCLE),
    commentsMin: String(COMMENTS_MIN_PER_CYCLE),
    commentsMax: String(COMMENTS_MAX_PER_CYCLE),
  });

  const knownHandles = new Set(ctx.accounts.map((a) => a.handle));

  const result = await generateValidated<RawAdvanceWorldResponse>({
    apiKey: ctx.apiKey,
    systemPrompt,
    initialUserPrompt,
    // No response_format/jsonSchema here either -- live testing showed the same
    // empty-completion/invalid-JSON failure pattern on this call as on bootstrap
    // (see generator/bootstrap.ts), so strict structured-output mode appears broadly
    // unreliable across openrouter/free's random model pool, not just for large
    // schemas. Falls back to the prompt's literal example shape + validation/retry.
    maxTokens: ADVANCE_WORLD_MAX_TOKENS,
    timeoutMs: ADVANCE_WORLD_TIMEOUT_MS,
    parse: parseRawAdvanceWorld(knownHandles),
    onAttempt: ctx.onAttempt,
    fetchImpl: ctx.fetchImpl,
  });

  const warnings = checkCycleSizeWarnings(result.value, {
    itemsPerCycle: ITEMS_PER_CYCLE,
    commentsMin: COMMENTS_MIN_PER_CYCLE,
    commentsMax: COMMENTS_MAX_PER_CYCLE,
  });
  if (warnings.length > 0) ctx.onWarnings?.(warnings);

  const { items } = enrichAdvanceWorld(result.value, {
    runId: ctx.runId,
    now: ctx.now,
    idByHandle: ctx.idByHandle,
    rng: createRunRng(ctx.runId),
  });

  const nextWorld = WorldStateSchema.parse(
    mergeWorldStateUpdate(ctx.world, result.value.worldStateUpdate, {
      cycle: ctx.world.cycleCount + 1,
      batchId: ctx.runId,
      now: ctx.now,
      handleToAccountId: ctx.idByHandle,
    }),
  );

  return { items, nextWorld, modelUsed: result.modelUsed, attempts: result.attempts };
}
