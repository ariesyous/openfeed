import { describe, expect, it, vi } from "vitest";
import { GenerationFailedError, generateValidated } from "../retry";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

const okContent = (content: string) =>
  jsonResponse({ model: "vendor/model", choices: [{ message: { content } }] });

const baseOpts = {
  apiKey: "key",
  systemPrompt: "system",
  initialUserPrompt: "user",
  sleepImpl: async () => {},
};

describe("generateValidated", () => {
  it("succeeds on the first attempt when the response is valid JSON that parses", async () => {
    const fetchImpl = vi.fn(async () => okContent(JSON.stringify({ ok: true })));
    const parse = vi.fn((json: unknown) => ({ ok: true as const, value: json }));

    const result = await generateValidated({ ...baseOpts, fetchImpl, parse });

    expect(result.attempts).toBe(1);
    expect(result.modelUsed).toBe("vendor/model");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("accepts a response wrapped in a markdown code fence", async () => {
    const fetchImpl = vi.fn(async () => okContent('```json\n{"ok":true}\n```'));
    const parse = (json: unknown) => ({ ok: true as const, value: json });

    const result = await generateValidated({ ...baseOpts, fetchImpl, parse });
    expect(result.value).toEqual({ ok: true });
  });

  it("retries on a retryable failure and succeeds on a later attempt", async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call < 3) return new Response("server error", { status: 500 });
      return okContent(JSON.stringify({ ok: true }));
    });
    const parse = (json: unknown) => ({ ok: true as const, value: json });

    const result = await generateValidated({ ...baseOpts, fetchImpl, parse });
    expect(result.attempts).toBe(3);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on a fatal failure without retrying", async () => {
    const fetchImpl = vi.fn(async () => new Response("no credits", { status: 402 }));
    const parse = (json: unknown) => ({ ok: true as const, value: json });

    await expect(generateValidated({ ...baseOpts, fetchImpl, parse })).rejects.toBeInstanceOf(
      GenerationFailedError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls back to plain-JSON prompting after a structured-output rejection, within the same attempt budget", async () => {
    let call = 0;
    const requestedJsonSchema: Array<boolean> = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      call += 1;
      const body = JSON.parse(String((init as RequestInit).body));
      requestedJsonSchema.push(!!body.response_format);
      if (call === 1) {
        return new Response(
          JSON.stringify({ error: { message: "response_format not supported" } }),
          { status: 400 },
        );
      }
      return okContent(JSON.stringify({ ok: true }));
    });
    const parse = (json: unknown) => ({ ok: true as const, value: json });

    const result = await generateValidated({
      ...baseOpts,
      jsonSchema: { name: "test", schema: {} },
      fetchImpl,
      parse,
    });

    expect(result.attempts).toBe(2);
    expect(result.usedStructuredOutput).toBe(false);
    expect(requestedJsonSchema).toEqual([true, false]);
  });

  it("retries with a correction message on malformed JSON, then succeeds", async () => {
    let call = 0;
    const prompts: string[] = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      call += 1;
      const body = JSON.parse(String((init as RequestInit).body));
      prompts.push(body.messages[1].content);
      if (call === 1) return okContent("not json at all {{{");
      return okContent(JSON.stringify({ ok: true }));
    });
    const parse = (json: unknown) => ({ ok: true as const, value: json });

    const result = await generateValidated({ ...baseOpts, fetchImpl, parse });
    expect(result.attempts).toBe(2);
    expect(prompts[1]).toContain("was not valid JSON");
  });

  it("retries with a correction message on schema-validation failure, then succeeds", async () => {
    let call = 0;
    const prompts: string[] = [];
    const fetchImpl = vi.fn(async (_url, init) => {
      call += 1;
      const body = JSON.parse(String((init as RequestInit).body));
      prompts.push(body.messages[1].content);
      return okContent(JSON.stringify({ n: call }));
    });
    const parse = vi.fn((json: unknown) => {
      const n = (json as { n: number }).n;
      return n === 2
        ? { ok: true as const, value: n }
        : { ok: false as const, issues: ["n must be 2"] };
    });

    const result = await generateValidated({ ...baseOpts, fetchImpl, parse });
    expect(result.attempts).toBe(2);
    expect(prompts[1]).toContain("n must be 2");
  });

  it("throws after exhausting all attempts", async () => {
    const fetchImpl = vi.fn(async () => new Response("server error", { status: 500 }));
    const parse = (json: unknown) => ({ ok: true as const, value: json });

    await expect(
      generateValidated({ ...baseOpts, fetchImpl, parse, maxAttempts: 3 }),
    ).rejects.toBeInstanceOf(GenerationFailedError);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

it("reports malformed output with resolved model and truncation metadata without dumping content", async () => {
  const onAttempt = vi.fn();
  const fetchImpl = vi.fn(async () => jsonResponse({
    model: "vendor/model", choices: [{finish_reason: "length", message: {content: '{"private-output":'}}],
  }));
  await expect(generateValidated({
    ...baseOpts, fetchImpl, onAttempt, maxAttempts: 1,
    parse: (json) => ({ok: true, value: json}),
  })).rejects.toBeInstanceOf(GenerationFailedError);
  expect(onAttempt).toHaveBeenCalledWith(expect.objectContaining({
    outcomeKind: "invalid_json", modelUsed: "vendor/model", finishReason: "length",
    detail: expect.stringContaining("finish reason: length"),
  }));
  expect(JSON.stringify(onAttempt.mock.calls)).not.toContain("private-output");
});
