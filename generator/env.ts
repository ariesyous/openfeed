/** Loads .env for local development. Safe to call even if the file doesn't exist
 * (e.g. in CI, where OPENROUTER_API_KEY is provided directly as an env var). */
export function loadEnvFile(): void {
  try {
    process.loadEnvFile(".env");
  } catch {
    // .env is optional -- CI and shells that already export the var don't need it.
  }
}

export function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. See .env.example for local development, " +
        "or provide it as a GitHub Actions secret in CI.",
    );
  }
  return key;
}
