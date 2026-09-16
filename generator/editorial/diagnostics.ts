interface AttemptInfo {
  attempt: number;
  outcomeKind: string;
  detail?: string;
  modelUsed?: string;
  finishReason?: string;
}

/** Keep useful failure details without dumping completions or credentials to public logs. */
export function logEditorialAttempt(info: AttemptInfo, apiKey: string, elapsedMs: number): void {
  const scrub = (value: string) => {
    const redacted = apiKey ? value.split(apiKey).join("[REDACTED]") : value;
    return redacted
      .replace(/Bearer\s+[^\s"',;]+/gi, "Bearer [REDACTED]")
      .replace(/sk-or-[\w-]+/g, "[REDACTED]")
      .replace(/\p{Cc}/gu, " ")
      .slice(0, 2000);
  };
  const context = [
    `${Math.round(elapsedMs / 1000)}s elapsed`,
    info.modelUsed && `model=${info.modelUsed}`,
    info.finishReason && `finish=${info.finishReason}`,
  ].filter(Boolean).join("; ");
  console.log(scrub(`[editorial] attempt ${info.attempt}: ${info.outcomeKind} (${context})${info.detail ? ` — ${info.detail}` : ""}`));
}
