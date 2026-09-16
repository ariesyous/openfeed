import type { SourcePacket } from "./sources";

export interface EvidenceEntry {
  sourceId: string;
  quote: string;
}

/** Take complete words verbatim, including original whitespace between them. */
export function evidenceSpans(text: string): string[] {
  const words = [...text.matchAll(/\S+/g)];
  const spans: string[] = [];
  for (let start = 0; start < words.length;) {
    let end = start;
    while (end < words.length && end - start < 25 &&
      words[end].index! + words[end][0].length - words[start].index! <= 300) end++;
    if (end === start) { start++; continue; }
    const quote = text.slice(words[start].index, words[end - 1].index! + words[end - 1][0].length);
    if (quote.length >= 12) spans.push(quote);
    start = end;
  }
  return spans;
}

/** Bound prompt size while retaining topic variety and preferring substantial excerpts. */
export function prepareEvidence(packets: SourcePacket[]) {
  const topics = new Map<string, SourcePacket[]>();
  for (const source of packets) {
    const group = topics.get(source.topic) ?? [];
    group.push(source);
    topics.set(source.topic, group);
  }
  for (const group of topics.values()) group.sort((a, b) => b.excerpt.length - a.excerpt.length);
  const selected: SourcePacket[] = [];
  for (let round = 0; selected.length < 16; round++) {
    let added = false;
    for (const group of topics.values()) {
      if (group[round] && selected.length < 16) { selected.push(group[round]); added = true; }
    }
    if (!added) break;
  }
  const evidenceById = new Map<string, EvidenceEntry>();
  const sources = selected.map((source, index) => {
    const evidence = evidenceSpans(source.excerpt).slice(0, 12).map((quote, spanIndex) => {
      const id = `S${index + 1}E${spanIndex + 1}`;
      evidenceById.set(id, { sourceId: source.id, quote });
      return { id, text: quote };
    });
    return {
      publisher: source.publisher, title: source.title, topic: source.topic,
      publishedAt: source.publishedAt ?? null, evergreen: source.evergreen ?? false, evidence,
    };
  }).filter((source) => source.evidence.length > 0);
  return { sources, evidenceById };
}
