/**
 * Deterministic headline-token similarity for deferring likely same-event candidates
 * within one run. It compares source headlines only; it is a heuristic, not semantic
 * event deduplication, and a match never marks a source as covered.
 * Calibration: docs/editorial-same-event.md.
 */

// Function words plus headline boilerplate that says nothing about the event.
const STOPWORDS = new Set(`
a about above after again against ago all also am amid among an and any are around as at
back be because been before being below between both but by can could did do does doing
down during each even ever every few for from further get gets got had has have having he
her here hers him his how i if in into is it its just like may me might more most much must
my near new next no nor not now of off on once one only or other our out over own per
says said say she should since so some such than that the their them then there these they
this those through to too toward towards two under until up upon us very via vs was we
were what when where whether which while who whom whose why will with within without would
yet you your
analysis exclusive explainer explained interview opinion review live update updates latest
watch video report reports reported tells told week weeks year years day days today time
first last
`.split(/\s+/).filter(Boolean));

/** Source headlines published this long before a run are compared with its candidates. */
export const SAME_EVENT_WINDOW_MS = 48 * 60 * 60 * 1000;
/** Shared distinctive tokens required for a match. */
export const SAME_EVENT_MIN_SHARED = 3;
/** A token in more than this share of the reference headlines (at least two) is too
 * common in recent coverage to identify an event, e.g. "nasa", "trump", "bedrock". */
export const SAME_EVENT_MAX_DF_SHARE = 0.02;

/** Normalized tokens: lowercased letters/digits, possessives and simple plurals
 * folded, stopwords, single characters and bare years removed. */
export function headlineTokens(title: string): Set<string> {
  const words = title.normalize("NFKC").toLocaleLowerCase("en")
    .replace(/['‘’]s\b/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(" ");
  const tokens = new Set<string>();
  for (const word of words) {
    if (word.length < 2 || STOPWORDS.has(word) || /^(19|20)\d\d$/.test(word)) continue;
    tokens.add(stem(word));
  }
  return tokens;
}

function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

export type SameEventMatch = { title: string; shared: string[] };

/**
 * Index of reference headlines (published recently or accepted earlier in this run).
 * Token frequency is counted over the reference headlines only, so the same inputs
 * always give the same matches.
 */
export function sameEventIndex(referenceTitles: Iterable<string>) {
  const titles = [...new Set(referenceTitles)];
  const tokens = titles.map(headlineTokens);
  const frequency = new Map<string, number>();
  for (const set of tokens) for (const token of set) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  const maxFrequency = Math.max(2, Math.ceil(titles.length * SAME_EVENT_MAX_DF_SHARE));
  const distinctive = (set: Set<string>) => new Set([...set].filter(token => (frequency.get(token) ?? 0) <= maxFrequency));
  const sharedTokens = (left: Set<string>, right: Set<string>) => {
    const a = distinctive(left), b = distinctive(right);
    const shared = [...a].filter(token => b.has(token));
    return shared.length >= SAME_EVENT_MIN_SHARED ? shared : undefined;
  };
  return {
    /** The first reference headline sharing enough distinctive tokens, if any. */
    match(title: string): SameEventMatch | undefined {
      const candidate = headlineTokens(title);
      for (const [index, reference] of tokens.entries()) {
        const shared = sharedTokens(candidate, reference);
        if (shared) return { title: titles[index], shared };
      }
      return undefined;
    },
    /** The same rule between two non-reference headlines, using the reference frequencies. */
    similar(a: string, b: string): string[] | undefined {
      return sharedTokens(headlineTokens(a), headlineTokens(b));
    },
  };
}
