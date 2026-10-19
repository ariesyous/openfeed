/** Bounded Chat Completions SSE framing. Never retain reasoning or accept a partial
 * completion: both a terminal choice and [DONE] are required before validation. */
export async function readCompletionStream(response: Response) {
  if (!response.body) throw new Error("missing completion stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", content = "", model: string | undefined, finish: string | undefined;
  let reasoning = false, refusal = false, done = false, bytes = 0;
  const event = (frame: string) => {
    const data = frame.split("\n").filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).replace(/^ /, "")).join("\n");
    if (!data) return; // Heartbeats, comments and other SSE fields.
    if (done) throw new Error("completion data after [DONE]");
    if (data === "[DONE]") { done = true; return; }
    // Invalid frames fail the whole attempt; never skip possible content/errors.
    const chunk = JSON.parse(data);
    if (chunk.error) throw new StreamProviderError(chunk.error.code);
    if (typeof chunk.model === "string" && chunk.model.trim()) {
      if (model && model !== chunk.model.trim()) throw new Error("model changed within completion stream");
      model = chunk.model.trim();
    }
    for (const choice of chunk.choices ?? []) {
      if (choice.index !== 0) throw new Error("unexpected streamed choice");
      if (choice.finish_reason === "error") throw new Error("provider terminated completion stream");
      const delta = choice.delta;
      if (delta?.content !== undefined && delta.content !== null && typeof delta.content !== "string")
        throw new Error("invalid completion delta");
      if (delta?.content) {
        if (finish) throw new Error("content after terminal choice");
        content += delta.content;
      }
      reasoning ||= Boolean(delta?.reasoning || delta?.reasoning_content || delta?.reasoning_details?.length);
      refusal ||= Boolean(delta?.refusal);
      if (choice.finish_reason) {
        if (finish && finish !== choice.finish_reason) throw new Error("conflicting terminal choices");
        finish = choice.finish_reason; // Usage frames may repeat the terminal reason.
      }
    }
  };
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      // Reasoning is discarded frame by frame; this is a wire bound, not an audit.
      if (bytes > 8 * 1024 * 1024) throw new Error("completion stream exceeds byte limit");
      buffer += decoder.decode(next.value, { stream: true });
      // Leave a final CR buffered until we know whether a split LF follows it.
      buffer = buffer.replace(/\r\n|\r(?=[^\n])/g, "\n");
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        event(buffer.slice(0, boundary)); buffer = buffer.slice(boundary + 2);
      }
    }
    buffer = (buffer + decoder.decode()).replace(/\r/g, "\n");
    if (buffer.trim()) event(buffer);
    if (!done || !finish) throw new Error("incomplete completion stream");
    return { model, choices: [{ finish_reason: finish, message: { content, reasoning, refusal } }] };
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export class StreamProviderError extends Error {
  constructor(readonly code: unknown) { super(`streamed provider error (${String(code ?? "unknown").slice(0, 40)})`); }
}
