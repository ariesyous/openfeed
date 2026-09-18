import { BACKOFF_BASE_MS, MAX_ATTEMPTS } from "./config";
import { callOpenRouter, type JsonSchemaSpec, type OpenRouterMessage } from "./openrouter";

export class GenerationFailedError extends Error {
  readonly attempts: number;

  constructor(message: string, attempts: number) {
    super(message);
    this.name = "GenerationFailedError";
    this.attempts = attempts;
  }
}

export class GenerationDeadlineError extends GenerationFailedError {
  constructor(attempts: number) {
    super("edition time budget exhausted", attempts);
    this.name = "GenerationDeadlineError";
  }
}

export type ParseOutcome<T> = { ok: true; value: T } | { ok: false; issues: string[] };

export interface GenerateValidatedOptions<T> {
  apiKey: string;
  systemPrompt: string;
  initialUserPrompt: string;
  jsonSchema?: JsonSchemaSpec;
  /** Without this, a randomly-picked free model may silently truncate a large response. */
  maxTokens?: number;
  /** A larger max_tokens needs a longer request timeout -- a slow free model can easily
   * take well over a minute to finish generating an 8000-token completion. */
  timeoutMs?: number;
  /** Wraps Zod .safeParse plus any cross-reference checks; issues are human-readable
   * strings fed back to the model on retry. */
  parse: (json: unknown) => ParseOutcome<T>;
  maxAttempts?: number;
  /** Shared absolute deadline across chunks and retries. */
  deadlineMs?: number;
  nowImpl?: () => number;
  onAttempt?: (info: { attempt: number; outcomeKind: string; detail?: string; modelUsed?: string; finishReason?: string }) => void;
  /** Injectable for tests, so retry/backoff tests don't actually sleep. */
  sleepImpl?: (ms: number) => Promise<void>;
  /** Passed through to callOpenRouter; injectable for tests. */
  fetchImpl?: typeof fetch;
}

export interface GenerateValidatedResult<T> {
  value: T;
  attempts: number;
  modelUsed: string;
  requestedModel: string;
  resolvedModel: string | null;
  usedStructuredOutput: boolean;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with jitter (~2/5/10/20s base) before attempts 2..N; attempt 1
 * never waits. Per ProjectSpecifications.md §14. */
function backoffDelayMs(attempt: number): number {
  const base = BACKOFF_BASE_MS[Math.min(attempt - 2, BACKOFF_BASE_MS.length - 1)];
  return base + Math.random() * 0.3 * base;
}

/** Strips a single leading/trailing markdown code fence if the whole response is wrapped
 * in one. No other JSON repair is attempted -- if the JSON is actually malformed, the
 * caller retries generation rather than trying to heuristically fix it (§14). */
export function stripCodeFence(input: string): string {
  const trimmed = input.trim();
  const match = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/.exec(trimmed);
  return match ? match[1] : trimmed;
}

function appendCorrection(prompt: string, issues: string[]): string {
  const bullets = issues.map((issue) => `- ${issue}`).join("\n");
  return (
    `${prompt}\n\nYour previous response was rejected for the following reasons:\n${bullets}\n\n` +
    "Please correct these issues and resend the complete JSON object (the whole thing, not a diff)."
  );
}

/** Calls OpenRouter, validates the result, and retries on transient failures or invalid
 * output -- up to maxAttempts, with backoff and a fallback out of structured-output mode
 * if the resolved model doesn't support it. Throws GenerationFailedError if every attempt
 * fails. */
export async function generateValidated<T>(
  opts: GenerateValidatedOptions<T>,
): Promise<GenerateValidatedResult<T>> {
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS;
  const sleep = opts.sleepImpl ?? defaultSleep;
  const clock = opts.nowImpl ?? Date.now;
  const remaining = () => (opts.deadlineMs ?? Infinity) - clock();
  const minimumRequestMs = 60_000;

  let userPrompt = opts.initialUserPrompt;
  let useStructured = !!opts.jsonSchema;
  let minNextDelayMs = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      const delay = Math.max(backoffDelayMs(attempt), minNextDelayMs);
      if (remaining() < delay + minimumRequestMs) throw new GenerationDeadlineError(attempt - 1);
      await sleep(delay);
      minNextDelayMs = 0;
    }

    if (remaining() < minimumRequestMs) throw new GenerationDeadlineError(attempt - 1);
    const messages: OpenRouterMessage[] = [
      { role: "system", content: opts.systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const outcome = await callOpenRouter({
      apiKey: opts.apiKey,
      messages,
      jsonSchema: useStructured ? opts.jsonSchema : undefined,
      maxTokens: opts.maxTokens,
      timeoutMs: Math.min(opts.timeoutMs ?? 60_000, remaining()),
      fetchImpl: opts.fetchImpl,
    });

    if (!outcome.ok) {
      opts.onAttempt?.({ attempt, outcomeKind: outcome.kind, detail: outcome.reason });

      if (outcome.kind === "fatal") {
        throw new GenerationFailedError(outcome.reason, attempt);
      }
      if (outcome.kind === "unsupported_structured_output") {
        useStructured = false;
        userPrompt =
          `${userPrompt}\n\nRespond with raw JSON only matching the shape described above ` +
          "-- no schema enforcement is available for this request. No markdown fences, no " +
          "prose before or after the JSON object.";
        continue;
      }
      if (outcome.retryAfterMs) minNextDelayMs = outcome.retryAfterMs;
      continue;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stripCodeFence(outcome.content));
    } catch {
      opts.onAttempt?.({
        attempt, outcomeKind: "invalid_json", modelUsed: outcome.modelUsed,
        finishReason: outcome.finishReason,
        detail: `Completion was not valid JSON (${outcome.content.length} characters); finish reason: ${outcome.finishReason ?? "unknown"}`,
      });
      userPrompt = appendCorrection(userPrompt, ["the response was not valid JSON"]);
      continue;
    }

    const parsed = opts.parse(parsedJson);
    if (!parsed.ok) {
      opts.onAttempt?.({
        attempt,
        outcomeKind: "validation_failed",
        modelUsed: outcome.modelUsed,
        finishReason: outcome.finishReason,
        detail: parsed.issues.join("; "),
      });
      userPrompt = appendCorrection(userPrompt, parsed.issues);
      continue;
    }

    opts.onAttempt?.({ attempt, outcomeKind: "success", modelUsed: outcome.modelUsed, finishReason: outcome.finishReason });
    return {
      value: parsed.value,
      attempts: attempt,
      modelUsed: outcome.modelUsed,
      requestedModel: outcome.requestedModel,
      resolvedModel: outcome.resolvedModel,
      usedStructuredOutput: useStructured,
    };
  }

  throw new GenerationFailedError(`all ${maxAttempts} attempts failed`, maxAttempts);
}
