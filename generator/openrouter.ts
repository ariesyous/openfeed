import { getOpenRouterModel, OPENROUTER_URL } from "./config";
import { readCompletionStream, StreamProviderError } from "./stream";

export interface OpenRouterMessage {
  role: "system" | "user";
  content: string;
}

export interface JsonSchemaSpec {
  name: string;
  schema: object;
}

export interface CallOpenRouterOptions {
  messages: OpenRouterMessage[];
  jsonSchema?: JsonSchemaSpec;
  apiKey: string;
  model?: string;
  /** Without this, a randomly-picked free model may default to a small completion
   * length and silently truncate a large structured response mid-JSON. */
  maxTokens?: number;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Request timeout in ms; openrouter/free can be slow under load. */
  timeoutMs?: number;
}

export type OpenRouterOutcome =
  | { ok: true; content: string; modelUsed: string; requestedModel: string; resolvedModel: string | null; finishReason?: string }
  | { ok: false; kind: "retryable"; reason: string; retryAfterMs?: number }
  | { ok: false; kind: "unsupported_structured_output"; reason: string }
  | { ok: false; kind: "fatal"; reason: string };

function parseRetryAfter(headers: Headers): number | undefined {
  const value = headers.get("Retry-After");
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return seconds * 1000;

  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());

  return undefined;
}

/** Low-level, single-attempt OpenRouter chat completion call. Never throws for HTTP-level
 * or network failures -- those are classified into an OpenRouterOutcome so the retry loop
 * (generator/retry.ts) can decide what to do. Never logs or returns the API key. */
export async function callOpenRouter(opts: CallOpenRouterOptions): Promise<OpenRouterOutcome> {
  const model = opts.model ?? getOpenRouterModel();
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    stream: true,
    // Keep the model/reasoning unchanged, prefer the cheapest endpoints, and require
    // support for the requested schema. Only fp8-or-better (or undisclosed) endpoints
    // qualify, so price sorting never lands on fp4 variants. Same-model fallbacks stay.
    provider: { sort: "price", quantizations: ["fp8", "fp16", "bf16", "fp32", "unknown"],
      require_parameters: true, allow_fallbacks: true },
  };
  if (opts.maxTokens) {
    body.max_tokens = opts.maxTokens;
  }
  if (opts.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: opts.jsonSchema.name, strict: true, schema: opts.jsonSchema.schema },
    };
  }

  const doFetch = opts.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await doFetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, kind: "retryable", reason: `network error: ${reason}` };
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");

    if (response.status === 402) {
      return { ok: false, kind: "fatal", reason: "insufficient OpenRouter credits (402)" };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, kind: "fatal", reason: `OpenRouter authentication, permission or key limit failure (${response.status})` };
    }
    if (response.status === 429) {
      return {
        ok: false,
        kind: "retryable",
        reason: "rate limited (429)",
        retryAfterMs: parseRetryAfter(response.headers),
      };
    }
    if (response.status >= 500) {
      return { ok: false, kind: "retryable", reason: `server error (${response.status})` };
    }
    if (response.status === 400) {
      const mentionsStructuredOutput =
        /response_format|json_schema|structured.?output/i.test(bodyText);
      if (mentionsStructuredOutput) {
        return {
          ok: false,
          kind: "unsupported_structured_output",
          reason: `model rejected structured output request: ${bodyText.slice(0, 300)}`,
        };
      }
      // openrouter/free re-picks a random underlying model on the next attempt, so a
      // token-limit complaint from this one is worth retrying rather than failing fast.
      const mentionsTokenLimit = /max_tokens|context.?length|token.?limit/i.test(bodyText);
      if (mentionsTokenLimit) {
        return {
          ok: false,
          kind: "retryable",
          reason: `model rejected token limit: ${bodyText.slice(0, 300)}`,
        };
      }
      return { ok: false, kind: "fatal", reason: `bad request (400): ${bodyText.slice(0, 300)}` };
    }
    return {
      ok: false,
      kind: "retryable",
      reason: `unexpected status (${response.status}): ${bodyText.slice(0, 300)}`,
    };
  }

  let json: unknown;
  try {
    json = response.headers.get("content-type")?.includes("text/event-stream")
      ? await readCompletionStream(response) : await response.json();
  } catch (err) {
    // Headers can arrive before the body is fully written, so a slow completion can get
    // aborted mid-body-read once timeoutMs elapses -- surfacing here, not in the fetch()
    // try/catch above. Report the real cause rather than a generic "not valid JSON".
    if (err instanceof StreamProviderError)
      return { ok: false, kind: [400, 401, 402, 403].includes(Number(err.code)) ? "fatal" : "retryable", reason: err.message };
    const reason = err instanceof SyntaxError ? "invalid completion stream or response JSON"
      : err instanceof Error || err instanceof DOMException ? `${err.name}: ${err.message}` : "unknown response read failure";
    return { ok: false, kind: "retryable", reason: `failed to read response body: ${reason}` };
  }

  const envelope = json as {
    model?: unknown;
    error?: { code?: unknown; message?: unknown };
    choices?: Array<{ finish_reason?: unknown; message?: { content?: unknown; refusal?: unknown; reasoning?: unknown } }>;
  } | null;
  if (envelope?.error) {
    const code = envelope.error.code;
    const message = typeof envelope.error.message === "string" ? envelope.error.message.slice(0, 300) : "unspecified error";
    return { ok: false, kind: [401, 402, 403].includes(Number(code)) ? "fatal" : "retryable", reason: `provider error (${String(code ?? "unknown")}): ${message}` };
  }
  const reportedModel = typeof envelope?.model === "string" && envelope.model.trim() ? envelope.model.trim() : null;
  // A routing alias is not an identified underlying model. Preserve the historical
  // display fallback in modelUsed, but never report that fallback as resolved.
  const resolvedModel = reportedModel && !["openrouter/free", "openrouter/auto"].includes(reportedModel) ? reportedModel : null;
  const modelUsed = reportedModel ?? model;
  const choice = Array.isArray(envelope?.choices) ? envelope.choices[0] : undefined;
  if (!choice) return { ok: false, kind: "retryable", reason: "empty completion (no choices returned)" };
  const finishReason = typeof choice.finish_reason === "string" ? choice.finish_reason : undefined;
  const content = choice.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return {
      ok: false, kind: "retryable",
      reason: `empty completion (model=${modelUsed}; finish=${finishReason ?? "unknown"}; refusal=${Boolean(choice.message?.refusal)}; reasoning=${Boolean(choice.message?.reasoning)})`,
    };
  }
  return { ok: true, content, modelUsed, requestedModel: model, resolvedModel, ...(finishReason ? { finishReason } : {}) };

}
