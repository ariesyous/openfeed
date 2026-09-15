import type { Account, FeedItem } from "../schemas";
import {
  ADVANCE_WORLD_MAX_TOKENS,
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

const FEED_ITEM_KINDS = [
  "text_post",
  "question",
  "discussion",
  "hot_take",
  "observation",
  "personal_anecdote",
  "joke",
  "community_post",
  "announcement",
  "link_preview",
  "reaction",
  "repost",
];

const ADVANCE_WORLD_JSON_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tempId: { type: "string" },
          kind: { type: "string", enum: FEED_ITEM_KINDS },
          authorHandle: { type: "string" },
          community: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          referencedTempId: { type: "string" },
          linkPreview: {
            type: "object",
            properties: {
              url: { type: "string" },
              domain: { type: "string" },
              linkTitle: { type: "string" },
              linkDescription: { type: "string" },
            },
            required: ["url", "domain", "linkTitle"],
          },
          comments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tempId: { type: "string" },
                authorHandle: { type: "string" },
                body: { type: "string" },
                parentTempId: { type: "string" },
              },
              required: ["tempId", "authorHandle", "body"],
            },
          },
          relativeAgeHint: { type: "string", enum: ["fresh", "recent", "older"] },
        },
        required: ["tempId", "kind", "authorHandle", "community", "body", "comments"],
      },
    },
    worldStateUpdate: {
      type: "object",
      properties: {
        newStorylines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              involvedHandles: { type: "array", items: { type: "string" } },
              status: { type: "string", enum: ["active", "escalating", "cooling", "resolved"] },
            },
            required: ["title", "summary", "involvedHandles", "status"],
          },
        },
        updatedStorylineIds: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              summary: { type: "string" },
              status: { type: "string", enum: ["active", "escalating", "cooling", "resolved"] },
            },
            required: ["id", "summary", "status"],
          },
        },
        newRunningJokes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              originHandles: { type: "array", items: { type: "string" } },
            },
            required: ["description", "originHandles"],
          },
        },
        newConflicts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string" },
              handles: { type: "array", items: { type: "string" } },
              heat: { type: "string", enum: ["simmering", "active", "cooling"] },
            },
            required: ["description", "handles", "heat"],
          },
        },
        currentTrends: {
          type: "array",
          items: {
            type: "object",
            properties: {
              topic: { type: "string" },
              community: { type: "string" },
              strength: { type: "number" },
            },
            required: ["topic", "community", "strength"],
          },
        },
        newMemoriesByHandle: { type: "object" },
        cycleSummary: { type: "string" },
      },
      required: [
        "newStorylines",
        "updatedStorylineIds",
        "newRunningJokes",
        "newConflicts",
        "currentTrends",
        "cycleSummary",
      ],
    },
  },
  required: ["items", "worldStateUpdate"],
} as const;

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
    jsonSchema: { name: "dopamine_feed_advance_world", schema: ADVANCE_WORLD_JSON_SCHEMA },
    maxTokens: ADVANCE_WORLD_MAX_TOKENS,
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
