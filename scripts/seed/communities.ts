export const COMMUNITIES = [
  "technology",
  "gaming",
  "relationships",
  "work",
  "local",
  "entertainment",
  "hobbies",
  "weird-internet",
  "science",
  "unpopular-opinions",
  "absurd-humor",
] as const;

export type Community = (typeof COMMUNITIES)[number];
