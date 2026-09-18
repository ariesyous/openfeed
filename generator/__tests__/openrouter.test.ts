import { describe, expect, it } from "vitest";
import { callOpenRouter } from "../openrouter";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

const baseOpts = {
  apiKey: "test-key",
  messages: [{ role: "user" as const, content: "hi" }],
};

describe("callOpenRouter", () => {
  it("returns ok:true with the resolved model on a valid 200 response", async () => {
    const fetchImpl = async () =>
      jsonResponse({
        model: "some-vendor/some-model",
        choices: [{ message: { content: "hello" } }],
      });

    const result = await callOpenRouter({ ...baseOpts, model: "openrouter/free", fetchImpl });
    expect(result).toEqual({ ok: true, content: "hello", modelUsed: "some-vendor/some-model", requestedModel: "openrouter/free", resolvedModel: "some-vendor/some-model" });
  });

  it.each([undefined, null, "", "  ", "openrouter/free", "openrouter/auto"])("does not infer a resolved model from missing metadata or a router alias (%s)", async (model) => {
    const result = await callOpenRouter({ ...baseOpts, model: "openrouter/free", fetchImpl: async () =>
      jsonResponse({ model, choices: [{ message: { content: "hello" } }] }) });
    expect(result).toMatchObject({ ok: true, requestedModel: "openrouter/free", resolvedModel: null });
  });

  it("classifies 429 as retryable and parses Retry-After", async () => {
    const fetchImpl = async () =>
      new Response("rate limited", { status: 429, headers: { "Retry-After": "3" } });

    const result = await callOpenRouter({ ...baseOpts, fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "retryable", retryAfterMs: 3000 });
  });

  it("classifies 500 as retryable", async () => {
    const fetchImpl = async () => new Response("server error", { status: 500 });
    const result = await callOpenRouter({ ...baseOpts, fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "retryable" });
  });

  it("classifies 402 as fatal", async () => {
    const fetchImpl = async () => new Response("insufficient credits", { status: 402 });
    const result = await callOpenRouter({ ...baseOpts, fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "fatal" });
  });

  it("classifies a 400 citing response_format as unsupported_structured_output", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ error: { message: "response_format not supported" } }), {
        status: 400,
      });
    const result = await callOpenRouter({ ...baseOpts, fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "unsupported_structured_output" });
  });

  it("classifies a generic 400 as fatal", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ error: { message: "invalid model id" } }), { status: 400 });
    const result = await callOpenRouter({ ...baseOpts, fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "fatal" });
  });

  it("classifies an empty choices array as retryable", async () => {
    const fetchImpl = async () => jsonResponse({ model: "x", choices: [] });
    const result = await callOpenRouter({ ...baseOpts, fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "retryable" });
  });

  it("classifies a thrown network error as retryable", async () => {
    const fetchImpl = async () => {
      throw new Error("ECONNRESET");
    };
    const result = await callOpenRouter({ ...baseOpts, fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "retryable" });
  });

  it("never includes the api key in the outcome", async () => {
    const fetchImpl = async () => new Response("nope", { status: 500 });
    const result = await callOpenRouter({ ...baseOpts, apiKey: "super-secret-key", fetchImpl });
    expect(JSON.stringify(result)).not.toContain("super-secret-key");
  });

  it("sends max_tokens when provided, so a large response isn't silently truncated", async () => {
    let sentBody: Record<string, unknown> | undefined;
    const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({ model: "x", choices: [{ message: { content: "ok" } }] });
    };

    await callOpenRouter({ ...baseOpts, maxTokens: 8000, fetchImpl });
    expect(sentBody?.max_tokens).toBe(8000);
  });

  it("reports a descriptive reason when the response body can't be read (e.g. aborted mid-stream)", async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => {
          throw new DOMException("The operation was aborted.", "AbortError");
        },
      }) as unknown as Response;

    const result = await callOpenRouter({ ...baseOpts, fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "retryable" });
    if (!result.ok) {
      expect(result.reason).toContain("AbortError");
    }
  });

  it("classifies a 400 citing a token limit as retryable, not fatal", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ error: { message: "max_tokens exceeds model limit" } }), {
        status: 400,
      });
    const result = await callOpenRouter({ ...baseOpts, fetchImpl });
    expect(result).toMatchObject({ ok: false, kind: "retryable" });
  });
});

it("distinguishes reasoning-only responses from missing choices without returning reasoning text", async () => {
  const result = await callOpenRouter({...baseOpts, fetchImpl: async () => jsonResponse({
    model: "free/model", choices: [{finish_reason: "length", message: {content: null, reasoning: "private reasoning"}}],
  })});
  expect(result).toMatchObject({ok: false, kind: "retryable"});
  expect(JSON.stringify(result)).toContain("finish=length");
  expect(JSON.stringify(result)).toContain("reasoning=true");
  expect(JSON.stringify(result)).not.toContain("private reasoning");
});

it("reports provider errors embedded in a successful HTTP response", async () => {
  const result = await callOpenRouter({...baseOpts, fetchImpl: async () => jsonResponse({error: {code: 503, message: "Provider unavailable"}})});
  expect(result).toMatchObject({ok: false, kind: "retryable", reason: "provider error (503): Provider unavailable"});
});
