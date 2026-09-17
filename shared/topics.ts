/** Stable topic IDs and URLs shared by generation, the app, and static pages. */
export const TOPICS = ["movies", "the_sopranos", "ai_agents", "canada", "united_states", "world", "greek_roman_mythology", "philosophy", "economics", "science", "technology"] as const;
export type Topic = typeof TOPICS[number];

const labels: Partial<Record<Topic, string>> = {
  ai_agents: "AI & Agents",
  the_sopranos: "The Sopranos",
  greek_roman_mythology: "Greek & Roman Mythology",
};
export function topicLabel(topic: string): string {
  return labels[topic as Topic] ?? topic.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export function topicSlug(topic: string): string {
  return topic.replaceAll("_", "-");
}
export function topicFromSlug(slug: string): Topic | undefined {
  return TOPICS.find(topic => topicSlug(topic) === slug);
}
export function topicPath(topic: string, base = "/"): string {
  return topic ? `${base.replace(/\/$/, "")}/topics/${topicSlug(topic)}/` : base;
}
/** null denotes an unknown topic route, rather than silently showing all posts. */
export function topicFromPath(pathname: string, base = "/"): Topic | "" | null {
  const prefix = `${base.replace(/\/$/, "")}/topics/`;
  if (!pathname.startsWith(prefix)) return "";
  return topicFromSlug(pathname.slice(prefix.length).replace(/\/$/, "")) ?? null;
}
