import { z } from "zod";
import type { prepareEvidence } from "./evidence";
import { FORMATS, TOPICS } from "./accounts";

/** Writer choices are atomic sentence groups, never individual continuation parts.
 * The persisted/reviewer contract remains the original, bounded snippet IDs.
 */
export function prepareWriterEvidence(prepared: ReturnType<typeof prepareEvidence>) {
  const groups = new Map<string, string[]>();
  const sources = prepared.sources.map(({ evidence, ...source }) => {
    const grouped = new Map<string, typeof evidence>();
    for (const entry of evidence) {
      const entries = grouped.get(entry.contextGroup) ?? [];
      entries.push(entry); grouped.set(entry.contextGroup, entries);
    }
    return { ...source, evidence: [...grouped].flatMap(([id, entries]) => {
      const ids = entries.map(entry => entry.id);
      // A group larger than the parent allowance cannot be used safely anywhere.
      if (ids.length > 6) return [];
      groups.set(id, ids);
      return [{ id, text: entries.map(entry => entry.text).join(" "),
        snippetCount: ids.length, section: entries[0].section, paragraph: entries[0].paragraph }];
    }) };
  }).filter(source => source.evidence.some(group => group.snippetCount <= 3));
  // A source needs at least one group that can ground its required discussion.
  const offered = new Set(sources.flatMap(source => source.evidence.map(group => group.id)));
  for (const id of groups.keys()) if (!offered.has(id)) groups.delete(id);
  return { sources, groups };
}

export function writerResponseSchema(groups: ReadonlyMap<string, string[]>, maxPosts: number) {
  if (!groups.size) throw new Error("Cannot generate without complete evidence groups");
  const ids = (limit: number) => z.array(z.enum([...groups].filter(([, parts]) => parts.length <= limit).map(([id]) => id)))
    .min(1).max(limit);
  // Each passage carries its own explicit choices, immediately before its prose.
  // Paragraphs preserve the writer's layout; they are not new citation allowances.
  const passage = (limit: number, length: number) => z.object({
    evidenceGroupIds: ids(limit), text: z.string().min(1).max(length),
  }).strict();
  return z.object({ posts: z.array(z.object({
    format: z.enum(FORMATS),
    title: passage(6, 150), topic: z.enum(TOPICS).nullable(),
    body: z.array(z.array(passage(6, 1800)).min(1).max(4)).min(1).max(3),
    discussion: z.array(z.object({
      voice: z.enum(["Take", "Pushback", "Reply", "Context"]),
      body: z.array(z.array(passage(3, 700)).min(1).max(3)).min(1).max(2),
    }).strict()).min(2).max(4), spoilers: z.boolean().nullable(),
  }).strict()).max(maxPosts) }).strict();
}

/** Union only the writer's explicit passage choices, then expand complete groups.
 * Reusing support across passages is intentional. Duplicates within a choice,
 * unknown IDs and over-budget UNITS fail; no missing support or prose is repaired.
 */
export function resolveWriterSelection(json: unknown, groups: ReadonlyMap<string, string[]>, maxPosts: number) {
  const parsed = writerResponseSchema(groups, maxPosts).safeParse(json);
  if (!parsed.success) return { ok: false as const, issues: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) };
  const issues: string[] = [];
  type Passage = { evidenceGroupIds: string[]; text: string };
  const resolve = (passages: Passage[], cap: number, target: string) => {
    for (const [i, passage] of passages.entries()) {
      if (new Set(passage.evidenceGroupIds).size !== passage.evidenceGroupIds.length)
        issues.push(`${target} passage ${i}: select each evidence group only once per passage`);
    }
    const chosen = new Set(passages.flatMap(passage => passage.evidenceGroupIds));
    const evidenceIds = [...chosen].flatMap(id => groups.get(id)!);
    if (evidenceIds.length > cap) issues.push(`${target}: complete evidence groups exceed the ${cap}-snippet allowance across the WHOLE unit; narrow the claims, not the sentence groups`);
    return evidenceIds;
  };
  const render = (paragraphs: Passage[][]) => paragraphs.map(paragraph => paragraph.map(passage => passage.text).join(" ")).join("\n\n");
  const posts = parsed.data.posts.map((post, i) => ({ ...post,
    title: post.title.text, body: render(post.body),
    evidenceIds: resolve([post.title, ...post.body.flat()], 6, `posts.${i}.title/body`),
    discussion: post.discussion.map((turn, j) => ({ voice: turn.voice, body: render(turn.body),
      evidenceIds: resolve(turn.body.flat(), 3, `posts.${i}.discussion.${j}`) })),
  }));
  return issues.length ? { ok: false as const, issues } : { ok: true as const, value: { posts } };
}

export type PreviousWriterSupport = { target: string; evidence: { sourceId: string; quote: string }[] }[];

/** Diagnostic remapping only. A revision must choose support again explicitly.
 * Match complete groups by source identity AND exact quotation, never by topic,
 * prose similarity, old request-local IDs or a reviewer's proposed facts.
 */
export function remapPreviousSupport(support: PreviousWriterSupport,
  prepared: ReturnType<typeof prepareEvidence>, groups: ReadonlyMap<string, string[]>) {
  return support.map(({ target, evidence }) => {
    const matched = new Set<string>();
    const evidenceGroupIds = [...groups].flatMap(([id, parts]) => {
      const entries = parts.map(part => prepared.evidenceById.get(part)!);
      if (!entries.every(entry => evidence.some(old => old.sourceId === entry.sourceId && old.quote === entry.quote))) return [];
      parts.forEach(part => matched.add(part));
      return [id];
    });
    const available = [...matched].map(id => prepared.evidenceById.get(id)!);
    return { target, evidenceGroupIds,
      unavailableSnippetCount: evidence.filter(old => !available.some(entry => entry.sourceId === old.sourceId && entry.quote === old.quote)).length };
  });
}
