// @vitest-environment node
import { describe, expect, it } from "vitest";
import { callOpenRouter } from "../openrouter";

const opts = { apiKey: "secret", messages: [{ role: "user" as const, content: "hi" }] };
const frame = (content: unknown) => `data: ${JSON.stringify(content)}\r\n\r\n`;
const chunk = (delta: object, finish_reason: string | null = null) => ({ model: "deepseek/deepseek-v4.1-flash", choices: [{ index: 0, delta, finish_reason }] });
function response(text: string, splitBytes = false) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(controller) {
    if (splitBytes) for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
    else controller.enqueue(bytes);
    controller.close();
  } }), { headers: { "content-type": "text/event-stream; charset=utf-8" } });
}
describe("bounded provider streaming", () => {
  it("joins split UTF-8/CRLF frames, ignores keepalives and discards reasoning, with repeated usage finish metadata", async () => {
    let request: Record<string, unknown> = {};
    const result = await callOpenRouter({ ...opts, jsonSchema: { name: "test", schema: {} }, fetchImpl: async (_url, init) => {
      request = JSON.parse(String(init?.body));
      return response(": OPENROUTER PROCESSING\r\n\r\n" + frame(chunk({ reasoning: "Private reasoning must not be retained." }))
        + frame(chunk({ content: '{"text":"caf' })) + frame(chunk({ content: 'é"}' }, "stop"))
        + frame({ ...chunk({}, "stop"), usage: { completion_tokens: 42 } }) + "data: [DONE]\r\n\r\n", true);
    } });
    expect(request).toMatchObject({ stream: true, provider: { sort: "throughput", require_parameters: true, allow_fallbacks: true } });
    expect(request).not.toHaveProperty("reasoning");
    expect(result).toMatchObject({ ok: true, content: '{"text":"café"}', finishReason: "stop", resolvedModel: "deepseek/deepseek-v4.1-flash" });
    expect(JSON.stringify(result)).not.toMatch(/Private reasoning|completion_tokens/);
  });
  it.each([
    frame(chunk({ content: "{}" }, "stop")), // A complete JSON prefix is still untrusted without DONE.
    frame(chunk({ content: "{}" })) + "data: [DONE]\n\n", // Missing terminal reason.
    frame(chunk({ content: "{}" }, "stop")) + "data: broken secret payload\n\ndata: [DONE]\n\n",
    frame(chunk({ content: "{}" }, "stop")) + frame(chunk({ content: "extra" })) + "data: [DONE]\n\n",
    frame(chunk({ content: "{}" }, "stop")) + frame({ error: { code: 503, message: "secret provider body" } }),
  ])("withholds a partial, malformed or errored stream", async text => {
    const result = await callOpenRouter({ ...opts, fetchImpl: async () => response(text) });
    expect(result).toMatchObject({ ok: false, kind: "retryable" });
    expect(JSON.stringify(result)).not.toMatch(/secret payload|secret provider body/);
  });
  it("keeps streamed key/billing failures fatal", async () => {
    for (const code of [401, 402, 403]) expect(await callOpenRouter({ ...opts,
      fetchImpl: async () => response(frame({ error: { code, message: "secret" } })),
    })).toMatchObject({ ok: false, kind: "fatal" });
  });
  it("reports empty-at-length without retaining reasoning", async () => {
    const result = await callOpenRouter({ ...opts, fetchImpl: async () => response(frame(chunk({ reasoning: "secret" }, "length")) + "data: [DONE]\n\n") });
    expect(result).toMatchObject({ ok: false, kind: "retryable", reason: expect.stringContaining("finish=length") });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
