interface AttemptInfo {
  attempt: number;
  outcomeKind: string;
  detail?: string;
  modelUsed?: string;
  finishReason?: string;
}

/** Shared by attempt logs and the Actions model summary. */
export function redactEditorialDiagnostic(value: string, apiKey: string): string {
  const redacted = apiKey ? value.split(apiKey).join("[REDACTED]") : value;
  return redacted
    .replace(/Bearer\s+[^\s"',;]+/gi, "Bearer [REDACTED]")
    .replace(/sk-or-[\w-]+/g, "[REDACTED]")
    .replace(/\p{Cc}/gu, " ")
    .slice(0, 2000);
}

/** Keep useful failure details without dumping completions or credentials to public logs. */
export function logEditorialAttempt(info: AttemptInfo, apiKey: string, elapsedMs: number): void {
  const context = [
    `${Math.round(elapsedMs / 1000)}s elapsed`,
    info.modelUsed && `model=${info.modelUsed}`,
    info.finishReason && `finish=${info.finishReason}`,
  ].filter(Boolean).join("; ");
  console.log(redactEditorialDiagnostic(`[editorial] attempt ${info.attempt}: ${info.outcomeKind} (${context})${info.detail ? ` — ${info.detail}` : ""}`, apiKey));
}
