// Catch recognizable narration about the generator's inputs. This is a focused
// editorial guard, not a semantic quality check or a ban on publisher attribution.
const PROCESS_COMMENTARY = [
  /\b(?:supplied|provided|available)\s+(?:source\s+)?(?:material|text|excerpts?|snippets?)\b/i,
  /\bsource\s+(?:packet|snippets?)\b/i,
  /\b(?:the|this|that|an?|publisher's)\s+excerpt\s+(?:does|doesn't|did|didn't|says?|gives?|mentions?|describes?|reports?|confirms?|establishes?|identifies?|supplies|ties|contrasts|stops?|only|also)\b/i,
  /\b(?:the|this)\s+(?:source|summary|snippet)\s+(?:does\s+not|doesn't|fails?\s+to)\s+(?:say|tell|explain|specify|identify|establish|provide|include|reveal)\b/i,
  /\b(?:we|i)\s+(?:do\s+not|don't|cannot|can't)\s+(?:write|say|tell|assess|judge)\b[^.!?]{0,80}\b(?:source|excerpt|material|information)\b/i,
  /\b(?:we're|we\s+are|i'm|i\s+am)\s+(?:only\s+)?(?:looking\s+at|working\s+(?:from|with))\s+(?:an?\s+)?(?:market\s+listing|panel\s+roster|excerpt|snippet|source\s+packet)\b/i,
  /\bnothing\s+here\s+(?:establishes|explains|tells|shows)\b/i,
  /\b(?:on|from|based\s+on)\s+the\s+evidence\s+(?:given|provided|supplied)\b/i,
];

export function hasSourceProcessCommentary(text: string): boolean {
  const normalized = text.normalize("NFKC").replace(/[’‘]/g, "'").replace(/\s+/g, " ");
  return PROCESS_COMMENTARY.some(pattern => pattern.test(normalized));
}

export function editorialVoiceIssues(post: {
  title: string;
  body: string;
  discussion?: { body: string }[];
}): string[] {
  const fields: [string, string][] = [
    ["title", post.title], ["body", post.body],
    ...(post.discussion ?? []).map((turn, index): [string, string] => [`discussion.${index}.body`, turn.body]),
  ];
  return fields.filter(([, text]) => hasSourceProcessCommentary(text)).map(([field]) =>
    `Source-process commentary in ${field}: write about the subject using supported facts; omit the post or discussion if evidence is insufficient. Keep ordinary attribution and supported uncertainty.`,
  );
}
