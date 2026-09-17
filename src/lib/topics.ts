const topicLabels: Record<string, string> = {
  ai_agents: "AI & Agents",
  the_sopranos: "The Sopranos",
  greek_roman_mythology: "Greek & Roman Mythology",
};

export function topicLabel(topic: string): string {
  return topicLabels[topic] ?? topic.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
