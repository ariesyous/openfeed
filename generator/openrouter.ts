import { OPENROUTER_MODEL, OPENROUTER_URL } from "./config";

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
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Request timeout in ms; openrouter/free can be slow under load. */
  timeoutMs?: number;
}

export type OpenRouterOutcome =
  | { ok: true; content: string; modelUsed: string }
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
  const model = opts.model ?? OPENROUTER_MODEL;
  const body: Record<string, unknown> = {
    model,
    messages: opts.messages,
    stream: false,
  };
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
    json = await response.json();
  } catch {
    return { ok: false, kind: "retryable", reason: "response was not valid JSON" };
  }

  const content = (json as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]
    ?.message?.content;
  if (!content) {
    return { ok: false, kind: "retryable", reason: "empty completion (no choices returned)" };
  }

  const modelUsed = (json as { model?: string })?.model ?? model;
  return { ok: true, content, modelUsed };
}
