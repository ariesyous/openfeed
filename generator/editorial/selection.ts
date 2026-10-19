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
  return z.object({ posts: z.array(z.object({
    format: z.enum(FORMATS),
    title: z.string().min(1).max(150), topic: z.enum(TOPICS).nullable(),
    body: z.string().min(20).max(1800), evidenceGroupIds: ids(6),
    discussion: z.array(z.object({
      voice: z.enum(["Take", "Pushback", "Reply", "Context"]), body: z.string().min(10).max(700), evidenceGroupIds: ids(3),
    }).strict()).min(2).max(4), spoilers: z.boolean().nullable(),
  }).strict()).max(maxPosts) }).strict();
}

/** Explicit group selection expands before the unchanged strict provenance gates.
 * Unknown choices, duplicates and over-budget selections fail; nothing is repaired.
 */
export function resolveWriterSelection(json: unknown, groups: ReadonlyMap<string, string[]>, maxPosts: number) {
  const parsed = writerResponseSchema(groups, maxPosts).safeParse(json);
  if (!parsed.success) return { ok: false as const, issues: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) };
  const issues: string[] = [];
  const resolve = ({ evidenceGroupIds, ...unit }: { evidenceGroupIds: string[] }, cap: number) => {
    const evidenceIds = evidenceGroupIds.flatMap(id => groups.get(id)!);
    if (new Set(evidenceGroupIds).size !== evidenceGroupIds.length) issues.push("Select each evidence group only once per unit");
    if (evidenceIds.length > cap) issues.push(`Complete evidence groups exceed the ${cap}-snippet allowance; narrow the claim or choose a smaller group`);
    return { ...unit, evidenceIds };
  };
  const posts = parsed.data.posts.map(post => ({ ...resolve(post, 6), discussion: post.discussion.map(turn => resolve(turn, 3)) }));
  return issues.length ? { ok: false as const, issues } : { ok: true as const, value: { posts } };
}
