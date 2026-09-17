import { AccountSchema } from "../../schemas";
export const FORMATS = ["news", "explainer", "story", "banter"] as const;
export { TOPICS } from "../../shared/topics";
const columnTopics = {
  news: ["ai_agents", "canada", "united_states", "world", "economics", "technology"],
  explainer: ["philosophy", "economics", "greek_roman_mythology", "ai_agents", "science", "technology"],
  story: ["movies", "the_sopranos", "greek_roman_mythology", "science", "canada", "world"],
  banter: ["movies", "the_sopranos", "ai_agents", "economics", "philosophy", "technology"],
};
const names = {
  news: "The Brief",
  explainer: "Explained",
  story: "Good Stories",
  banter: "The Back-and-Forth",
};
export function editorialAccounts(now: Date) {
  return FORMATS.map((format) =>
    AccountSchema.parse({
      id: `editorial-${format}`,
      handle: format,
      displayName: names[format],
      bio:
        format === "banter"
          ? "AI-written commentary on real topics. Opinions and jokes, not eyewitness accounts."
          : "An AI-edited reading column grounded in linked publisher excerpts. Open the original for full context.",
      personalityTraits: ["curious"],
      interests: columnTopics[format],
      writingStyle: {
        formality: 0.5,
        avgPostLength: "variable",
        quirks: [],
        emojiUsage: "rare",
      },
      communities: columnTopics[format],
      behavioralTendencies: {
        positivity: 0.5,
        controversialTake: 0,
        replyRate: 0,
      },
      relationships: [],
      activityLevel: "medium",
      createdAt: now.toISOString(),
    }),
  );
}
