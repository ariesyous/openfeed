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

const BOOTSTRAP_JSON_SCHEMA = {
  type: "object",
  properties: {
    accounts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          handle: { type: "string" },
          displayName: { type: "string" },
          bio: { type: "string" },
          personalityTraits: { type: "array", items: { type: "string" } },
          interests: { type: "array", items: { type: "string" } },
          writingStyle: {
            type: "object",
            properties: {
              formality: { type: "number" },
              avgPostLength: { type: "string", enum: ["short", "medium", "long", "variable"] },
              quirks: { type: "array", items: { type: "string" } },
              emojiUsage: { type: "string", enum: ["none", "rare", "occasional", "frequent"] },
            },
            required: ["formality", "avgPostLength", "quirks", "emojiUsage"],
          },
          communities: { type: "array", items: { type: "string" } },
          behavioralTendencies: {
            type: "object",
            properties: {
              positivity: { type: "number" },
              controversialTake: { type: "number" },
              replyRate: { type: "number" },
            },
            required: ["positivity", "controversialTake", "replyRate"],
          },
          relationships: {
            type: "array",
            items: {
              type: "object",
              properties: {
                handle: { type: "string" },
                type: { type: "string", enum: ["friend", "rival", "mutual", "fan", "blocked"] },
              },
              required: ["handle", "type"],
            },
          },
          activityLevel: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: [
          "handle",
          "displayName",
          "bio",
          "personalityTraits",
          "interests",
          "writingStyle",
          "communities",
          "behavioralTendencies",
          "relationships",
          "activityLevel",
        ],
      },
    },
    communities: { type: "array", items: { type: "string" } },
    initialStorylines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          involvedHandles: { type: "array", items: { type: "string" } },
        },
        required: ["title", "summary", "involvedHandles"],
      },
    },
  },
  required: ["accounts", "communities"],
} as const;

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
    jsonSchema: { name: "dopamine_feed_bootstrap", schema: BOOTSTRAP_JSON_SCHEMA },
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
