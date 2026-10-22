import type { SourcePacket } from "./sources";

/**
 * Reader-interest topics the user asked to surface earlier (October 22, 2026). They
 * only break ties between otherwise equal topics; this is a preference, not a quota.
 */
export const PREFERRED_TOPICS: readonly string[] = ["the_sopranos", "greek_roman_mythology", "philosophy"];

export type OfferState = {
  /** Accepted posts so far in this run, by topic. */
  acceptedByTopic: ReadonlyMap<string, number>;
  /** Times each topic has been offered to the writer in this run. */
  offersByTopic: ReadonlyMap<string, number>;
  /** Times each source has been offered to the writer in this run. */
  offersBySource: ReadonlyMap<string, number>;
};

const compare = (a: readonly number[], b: readonly number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

/**
 * Order candidates so per-topic round-robin selection rotates through topics within a
 * run: topics with fewer accepted posts, then fewer offers, come first, with preferred
 * topics breaking ties. Within a topic, sources offered fewer times come first, then
 * shelf (lasting) pages, then longer context. Every candidate is kept; only the order
 * in which the writer sees them changes.
 */
export function orderOfferCandidates(packets: readonly SourcePacket[], state: OfferState): SourcePacket[] {
  const firstSeen = new Map<string, number>();
  packets.forEach((packet, index) => { if (!firstSeen.has(packet.topic)) firstSeen.set(packet.topic, index); });
  const rank = (topic: string) => {
    const index = PREFERRED_TOPICS.indexOf(topic);
    return index < 0 ? PREFERRED_TOPICS.length : index;
  };
  const topicKey = (topic: string) => [state.acceptedByTopic.get(topic) ?? 0, state.offersByTopic.get(topic) ?? 0, rank(topic), firstSeen.get(topic)!];
  const sourceKey = (packet: SourcePacket) => [state.offersBySource.get(packet.id) ?? 0, packet.evergreen ? 0 : 1, -packet.excerpt.length];
  return packets.map((packet, index) => ({ packet, index }))
    .sort((a, b) => compare(topicKey(a.packet.topic), topicKey(b.packet.topic))
      || compare(sourceKey(a.packet), sourceKey(b.packet)) || a.index - b.index)
    .map(entry => entry.packet);
}
