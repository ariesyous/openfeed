const words = (text: string) => text.toLocaleLowerCase("en").match(/[\p{L}\p{N}]+/gu) ?? [];

/** Conservative copy detection, not a semantic novelty or quality judge. */
export function discussionRepetitionIssues(body: string, turns: { body: string }[]): string[] {
  const previous = [words(body)];
  const issues: string[] = [];
  for (const [index, turn] of turns.entries()) {
    const tokens = words(turn.body);
    if (tokens.length >= 16) {
      const repeated = previous.some(prior => {
        const phrases = new Set(prior.slice(0, -3).map((_, i) => prior.slice(i, i + 4).join(" ")));
        const covered = new Set<number>();
        for (let i = 0; i <= tokens.length - 4; i++) {
          if (phrases.has(tokens.slice(i, i + 4).join(" "))) {
            for (let j = i; j < i + 4; j++) covered.add(j);
          }
        }
        return covered.size / tokens.length >= 0.85;
      });
      if (repeated) issues.push(`discussion.${index}: near-verbatim repetition of the body or an earlier turn; add a distinct supported observation, challenge, interpretation or joke, or use fewer turns`);
    }
    previous.push(tokens);
  }
  return issues;
}
