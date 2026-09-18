import type { SourcePacket } from "./sources";

export interface EvidenceEntry {
  sourceId: string;
  quote: string;
}

interface EvidenceGroup {
  paragraph: number;
  spans: string[];
}

const sentences = new Intl.Segmenter("en", { granularity: "sentence" });
const fitsQuote = (text: string) => text.length <= 300 && text.split(/\s+/).length <= 25;

/** Split a long sentence without dropping its tail or an oversized token. */
function splitSentence(text: string): string[] {
  const words = [...text.matchAll(/\S+/g)];
  if (words.some(word => word[0].length > 300)) return [];
  const ranges: [number, number][] = [];
  for (let start = 0; start < words.length;) {
    let end = start + 1;
    while (end < words.length && end - start < 25 &&
      words[end].index! + words[end][0].length - words[start].index! <= 300) end++;
    ranges.push([start, end]);
    start = end;
  }
  const quote = ([start, end]: [number, number]) =>
    text.slice(words[start].index, words[end - 1].index! + words[end - 1][0].length);
  // Keep a short trailing clause attached to enough of its preceding words.
  if (ranges.length > 1) {
    const tail = ranges[ranges.length - 1], previous = ranges[ranges.length - 2];
    while (quote(tail).length < 12 && previous[1] - previous[0] > 1) {
      const expanded: [number, number] = [tail[0] - 1, tail[1]];
      if (!fitsQuote(quote(expanded))) break;
      tail[0]--; previous[1]--;
    }
  }
  const spans = ranges.map(quote);
  return spans.every(span => span.length >= 12) ? spans : [];
}

/** Group complete sentences and preserve paragraph boundaries, including short qualifications. */
function evidenceGroups(text: string): EvidenceGroup[] {
  const groups: EvidenceGroup[] = [];
  const paragraphs: { start: number; end: number; paragraph: number }[] = [];
  for (const [paragraph, match] of [...text.matchAll(/\S[\s\S]*?(?=\n\s*\n|$)/g)].entries()) {
    const start = match.index!, end = start + match[0].trimEnd().length;
    const previous = paragraphs.at(-1);
    // Very short paragraphs cannot satisfy the 12-character quote minimum alone.
    // Attach them verbatim, with their original blank line, instead of losing a caveat.
    if (previous && (end - start < 12 || previous.end - previous.start < 12)) previous.end = end;
    else paragraphs.push({ start, end, paragraph: paragraph + 1 });
  }
  for (const range of paragraphs) {
    const content = text.slice(range.start, range.end), paragraph = range.paragraph;
    const units: { start: number; end: number }[] = [];
    for (const { segment, index } of sentences.segment(content)) {
      const sentence = segment.trim();
      if (!sentence) continue;
      const start = index + segment.indexOf(sentence), end = start + sentence.length;
      const previous = units.at(-1);
      // Do not silently lose short qualifications such as "Not yet." or "No."
      if (previous && (sentence.length < 12 || previous.end - previous.start < 12)) previous.end = end;
      else units.push({ start, end });
    }
    let pending: { start: number; end: number } | undefined;
    const flush = () => {
      if (pending) {
        const quote = content.slice(pending.start, pending.end);
        if (quote.length >= 12) groups.push({ paragraph, spans: [quote] });
      }
      pending = undefined;
    };
    for (const unit of units) {
      const sentence = content.slice(unit.start, unit.end);
      if (!fitsQuote(sentence)) {
        flush();
        const spans = splitSentence(sentence);
        // Stop at an unrepresentable sentence, never reconnect text across a missing claim.
        if (!spans.length) return groups;
        groups.push({ paragraph, spans });
        continue;
      }
      if (pending && !fitsQuote(content.slice(pending.start, unit.end))) flush();
      pending = { start: pending?.start ?? unit.start, end: unit.end };
    }
    flush();
  }
  return groups;
}

/** Exact substrings, sentence/paragraph boundaries preferred; long sentences stay grouped. */
export function evidenceSpans(text: string): string[] {
  return evidenceGroups(text).flatMap(group => group.spans);
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
    const groups = evidenceGroups(source.excerpt);
    const evidence: { id: string; text: string; contextGroup: string; paragraph: number; part: number; parts: number }[] = [];
    let contextTruncated = groups.length > 0 && !source.excerpt.trimEnd().endsWith(groups.at(-1)!.spans.at(-1)!);
    for (const [groupIndex, group] of groups.entries()) {
      // A sentence's final qualification must not disappear at the twelve-ID cap.
      if (evidence.length + group.spans.length > 12) { contextTruncated = true; break; }
      for (const [part, quote] of group.spans.entries()) {
        const id = `S${index + 1}E${evidence.length + 1}`;
        evidenceById.set(id, { sourceId: source.id, quote });
        evidence.push({ id, text: quote, contextGroup: `S${index + 1}G${groupIndex + 1}`,
          paragraph: group.paragraph, part: part + 1, parts: group.spans.length });
      }
    }
    return {
      publisher: source.publisher, title: source.title, topic: source.topic,
      publishedAt: source.publishedAt ?? null, evergreen: source.evergreen ?? false, contextTruncated, evidence,
    };
  }).filter((source) => source.evidence.length > 0);
  return { sources, evidenceById };
}
