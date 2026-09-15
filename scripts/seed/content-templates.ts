import type { SeedPersona } from "./accounts.data";

export type Rng = () => number;

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function maybe(rng: Rng, probability: number): boolean {
  return rng() < probability;
}

export function pickInterest(rng: Rng, persona: SeedPersona): string {
  return pick(rng, persona.interests);
}

/** Applies a persona's writing-style quirks so voices stay distinguishable and imperfect. */
export function applyVoice(text: string, persona: SeedPersona, rng: Rng): string {
  let out = text;

  if (persona.writingStyle.formality < 0.25) {
    out = out.toLowerCase();
  }

  if (persona.writingStyle.quirks.includes("lowercase always")) {
    out = out.toLowerCase();
  }

  if (persona.writingStyle.quirks.includes("random capitalization") && maybe(rng, 0.4)) {
    out = out
      .split(" ")
      .map((word) => (maybe(rng, 0.2) ? word.toUpperCase() : word))
      .join(" ");
  }

  if (persona.writingStyle.quirks.includes("all caps sometimes") && maybe(rng, 0.15)) {
    out = out.toUpperCase();
  }

  if (persona.writingStyle.quirks.includes("no capitalization")) {
    out = out.charAt(0).toLowerCase() + out.slice(1);
  }

  if (
    persona.writingStyle.quirks.includes("trailing punctuation???") &&
    maybe(rng, 0.5) &&
    !out.endsWith("?")
  ) {
    out = `${out}???`;
  }

  if (persona.writingStyle.quirks.includes("trailing off mid sentence") && maybe(rng, 0.3)) {
    out = `${out}...`;
  }

  if (persona.writingStyle.emojiUsage === "frequent" && maybe(rng, 0.7)) {
    out = `${out} ${pick(rng, ["🌱", "🐾", "✨", "😭", "💀", "🙃"])}`;
  } else if (persona.writingStyle.emojiUsage === "occasional" && maybe(rng, 0.35)) {
    out = `${out} ${pick(rng, ["🙃", "💀", "😭", "lol"])}`;
  }

  return out;
}

interface TemplateResult {
  title?: string;
  body: string;
}

const FILLER_REACTIONS = [
  "no notes.",
  "i have thoughts.",
  "not the point but ok.",
  "we are not the same.",
  "this is a cry for help.",
  "anyway.",
];

export function textPost(persona: SeedPersona, rng: Rng): TemplateResult {
  const interest = pickInterest(rng, persona);
  const templates = [
    `spent the last 3 hours on ${interest} and could not tell you why`,
    `unpopular fact about ${interest}: nobody actually knows what they're doing`,
    `${interest} update: still going. no further comment.`,
    `normalize talking about ${interest} at inappropriate times`,
    `today's ${interest} thought: it's never as simple as it looks`,
    `me, at 2am, thinking about ${interest} again`,
    `${pick(rng, FILLER_REACTIONS)} — that's the whole post about ${interest}`,
    `you ever just stop and think about ${interest} for way too long`,
  ];
  return { body: pick(rng, templates) };
}

export function question(persona: SeedPersona, rng: Rng): TemplateResult {
  const interest = pickInterest(rng, persona);
  const templates = [
    `genuine question: is there a normal amount of time to spend on ${interest} or have i lost the plot`,
    `does anyone else's ${interest} situation feel completely out of control or is it just me`,
    `why does nobody warn you how much ${interest} will take over your life`,
    `serious ask — who do i even talk to about ${interest} problems at this point`,
    `is it just me or has ${interest} gotten weirdly competitive lately`,
  ];
  return { body: pick(rng, templates) };
}

export function discussion(persona: SeedPersona, rng: Rng): TemplateResult {
  const interest = pickInterest(rng, persona);
  const titles = [
    `let's talk about ${interest}`,
    `${interest}: where do people actually stand on this`,
    `ok so about ${interest}`,
  ];
  const bodies = [
    `I keep seeing takes on ${interest} that don't match my experience at all. curious what everyone else has actually run into.`,
    `Feels like there are two totally different camps on ${interest} and nobody's talking to each other. what's your take.`,
    `Been thinking about ${interest} a lot this week. not sure I have a conclusion, just a lot of loose thoughts.`,
  ];
  return { title: pick(rng, titles), body: pick(rng, bodies) };
}

export function hotTake(persona: SeedPersona, rng: Rng): TemplateResult {
  const interest = pickInterest(rng, persona);
  const templates = [
    `hot take: ${interest} is overrated and everyone's too scared to say it`,
    `${interest} discourse is exhausting and most of you haven't actually thought about it`,
    `controversial but: the whole ${interest} thing peaked a while ago and we're coasting on nostalgia`,
    `i said what i said about ${interest}. fight me in the comments.`,
    `${interest} truthers need to sit down`,
  ];
  return { body: pick(rng, templates) };
}

export function observation(persona: SeedPersona, rng: Rng): TemplateResult {
  const interest = pickInterest(rng, persona);
  const templates = [
    `noticed something weird about ${interest} today and now i can't unsee it`,
    `small observation: ${interest} people always do this one specific thing`,
    `nobody talks about this part of ${interest} but it's like 80% of the actual experience`,
    `there's a very specific type of person who gets into ${interest} and you can spot them immediately`,
  ];
  return { body: pick(rng, templates) };
}

export function personalAnecdote(persona: SeedPersona, rng: Rng): TemplateResult {
  const interest = pickInterest(rng, persona);
  const templates = [
    `story time: something happened with ${interest} today that i'm still thinking about`,
    `so this is embarrassing but i have to tell someone about the ${interest} thing that just happened`,
    `funny how ${interest} keeps putting me in situations i did not sign up for`,
    `update from earlier: the ${interest} plan did not survive contact with reality`,
  ];
  return { body: pick(rng, templates) };
}

export function joke(persona: SeedPersona, rng: Rng): TemplateResult {
  const interest = pickInterest(rng, persona);
  const templates = [
    `${interest} is just a pyramid scheme with extra steps`,
    `me explaining ${interest} to someone who did not ask: [45 minute video]`,
    `${interest} but every time something goes wrong it's somehow my fault`,
    `you can tell a lot about someone by how they talk about ${interest}. mostly that they won't stop.`,
    `breaking: local person (me) discovers ${interest} exists, ruins everyone's week`,
  ];
  return { body: pick(rng, templates) };
}

export function communityPost(_persona: SeedPersona, rng: Rng, community: string): TemplateResult {
  const templates = [
    `anyone in the ${community} crowd around this week? been quiet lately`,
    `reminder that this ${community} space is only good because people actually show up for it`,
    `who else is deep in ${community} stuff right now, drop what you're working on`,
    `${community} check-in: what's everyone actually doing this week, not the highlight reel version`,
  ];
  return { body: pick(rng, templates) };
}

export function announcement(persona: SeedPersona, rng: Rng): TemplateResult {
  const interest = pickInterest(rng, persona);
  const templates = [
    `small announcement: taking a step back from posting about ${interest} for a bit. not dramatic, just tired`,
    `heads up — changed my mind about ${interest} completely. long story.`,
    `official update on the ${interest} situation: it's happening, details soon`,
    `psa: if you were waiting on my ${interest} thing, it's done. finally.`,
  ];
  return { body: pick(rng, templates) };
}

export function linkPreview(
  persona: SeedPersona,
  rng: Rng,
): TemplateResult & { url: string; domain: string; linkTitle: string; linkDescription?: string } {
  const interest = pickInterest(rng, persona);
  const domains = ["dispatch.example", "field-notes.example", "longread.example", "wire.example"];
  const domain = pick(rng, domains);
  const linkTitle = `The Quiet Rise of ${interest} (and why nobody saw it coming)`;
  const bodies = [
    `saw this and thought of literally everyone in my replies`,
    `not sure I agree with all of it but worth the read`,
    `sending this to everyone I know who's into ${interest}`,
  ];
  return {
    body: pick(rng, bodies),
    url: `https://${domain}/articles/${interest.replace(/\s+/g, "-").toLowerCase()}`,
    domain,
    linkTitle,
    linkDescription: maybe(rng, 0.5) ? `A closer look at ${interest} and what happens next.` : undefined,
  };
}

export function reaction(_persona: SeedPersona, rng: Rng, referencedSnippet: string): TemplateResult {
  const templates = [
    `this. all of this.`,
    `I don't know why this is living in my head today but here we are`,
    `absolutely not, but also I can't stop thinking about it`,
    `screenshotting this for later`,
    `"${truncate(referencedSnippet, 60)}" — yeah, felt that`,
  ];
  return { body: pick(rng, templates) };
}

export function repost(_persona: SeedPersona, rng: Rng, referencedSnippet: string): TemplateResult {
  const templates = [
    `still thinking about this one`,
    `bringing this back up because it's still true`,
    `for anyone who missed it the first time`,
    `"${truncate(referencedSnippet, 70)}"`,
  ];
  return { body: pick(rng, templates) };
}

export function commentBody(_persona: SeedPersona, rng: Rng, agree: boolean): string {
  const agreeTemplates = [
    "yeah honestly same",
    "this is so real",
    "finally someone said it",
    "real. no notes.",
    "came here to say this exact thing",
    "you get it",
  ];
  const disagreeTemplates = [
    "hard disagree but ok",
    "I mean... sure, if you say so",
    "this is a wild take actually",
    "found the guy who's wrong",
    "not this again",
    "we are not going to agree on this one",
  ];
  return pick(rng, agree ? agreeTemplates : disagreeTemplates);
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
