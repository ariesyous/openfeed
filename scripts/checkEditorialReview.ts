import { mkdirSync, writeFileSync } from "node:fs";
import { getApiKey, loadEnvFile } from "../generator/env";
import { logEditorialAttempt } from "../generator/editorial/diagnostics";
import { prepareEvidence } from "../generator/editorial/evidence";
import { reviewEditorial } from "../generator/editorial/review";
import type { SourcePacket } from "../generator/editorial/sources";
import type { ReviewPost } from "../generator/editorial/review";

// Manual live contract check, never part of scheduled publication. Synthetic
// controls exercise known error patterns; they are not historical regeneration
// or a representative accuracy benchmark. No public/state writes or source fetches.
loadEnvFile();
const now = new Date();
const packets: SourcePacket[] = [
  { id: "expectation", title: "A prevention officer describes a mistaken expectation", publisher: "Synthetic control A", topic: "technology",
    url: "https://example.com/synthetic-expectation", retrievedAt: now.toISOString(),
    excerpt: "A prevention officer said children often expect dangerous people to be nasty from the start." },
  { id: "referrals", title: "A charity describes professional referrals", publisher: "Synthetic control B", topic: "economics",
    url: "https://example.com/synthetic-referrals", retrievedAt: now.toISOString(),
    excerpt: "The charity works through professional referrers who know the families.\n\nIt considers applications from teachers, doctors and social workers." },
];
const prepared = prepareEvidence(packets);
const expectation = {
  title: "A misleading expectation of danger", body: packets[0].excerpt, evidenceIds: ["S1E1"],
  discussion: [
    { voice: "Take", body: "The officer says children expect friendliness at the start rather than nastiness.", evidenceIds: ["S1E1"] },
    { voice: "Pushback", body: "I would rather teach useful boundaries than wait for someone to audition for the role of obvious villain.", evidenceIds: ["S1E1"] },
  ],
};
const referral = {
  title: "Knowing the family through a professional referral", body: packets[1].excerpt, evidenceIds: ["S2E1", "S2E2"],
  discussion: [
    { voice: "Take", body: "I like the advantage of a referrer who already knows the family. A household is more than an abstract case number.", evidenceIds: ["S2E1"] },
    { voice: "Pushback", body: "A household out of contact with these professionals has no route to help at all.", evidenceIds: ["S2E1", "S2E2"] },
  ],
};
const correctedExpectation = structuredClone(expectation);
correctedExpectation.discussion[0].body = "Children may expect a dangerous person to appear nasty immediately. Apparently the villain forgot to wear the costume; a friendly opening is a poor safety test.";
const correctedReferral = structuredClone(referral);
correctedReferral.discussion[1].body = "That familiarity may also be a blind spot: families outside those relationships could be harder to notice. Knowing the people you can see is not the same as seeing everyone who needs help.";
const titlePacket: SourcePacket = { id: "jury", title: "A festival jury assesses a documentary", publisher: "Synthetic control C", topic: "movies",
  url: "https://example.com/synthetic-jury", retrievedAt: now.toISOString(),
  excerpt: "The festival jury gave the documentary The Long Road an award.\n\nThe jury praised the family's quiet resilience." };
const titlePost = {
  title: "A Prize for the Documentary That Praises Quiet Resilience", body: titlePacket.excerpt, evidenceIds: ["S1E1", "S1E2"],
  discussion: [
    { voice: "Take", body: "Patience over volume is an appealing taste. I would rather an award start an argument than finish one.", evidenceIds: ["S1E2"] },
    { voice: "Pushback", body: "And I would rather dignity not become a polite word for passivity. Quiet is a description, not an obligation.", evidenceIds: ["S1E2"] },
  ],
};
const scopePacket: SourcePacket = { id: "scope", title: "Seized turtles and a later law amendment", publisher: "Synthetic control D", topic: "canada",
  url: "https://example.com/synthetic-scope", retrievedAt: now.toISOString(),
  excerpt: "Officers seized sixty-three turtles in 2022.\n\nThe law was amended in 2009.\n\nThe amendments came into force in 2017." };
const scopePost = { title: "A Seizure of Sixty-Three Turtles", body: "Officers seized sixty-three turtles in 2022.", evidenceIds: ["S1E1"],
  discussion: [
    { voice: "Context", body: "The law was amended in 2009. The amendments came into force in 2017.", evidenceIds: ["S1E2"] },
    { voice: "Reply", body: "The amendments came into force in 2017. Apparently the legal clock travels by turtle.", evidenceIds: ["S1E3"] },
  ],
};
const wrongBody = { ...structuredClone(scopePost), body: "Officers seized sixty-three turtles in 2022. The amendments came into force in 2017." };
wrongBody.discussion[0].evidenceIds = ["S1E2", "S1E3"];
const correctedScope = structuredClone(scopePost);
correctedScope.discussion[0].evidenceIds = ["S1E2", "S1E3"];
const correctedBody = structuredClone(wrongBody);
correctedBody.evidenceIds = ["S1E1", "S1E3"];
const suites: { name: string; posts: ReviewPost[]; prepared: ReturnType<typeof prepareEvidence>; expectedRejected: string[] }[] = [
  { name: "reversal_and_unsupported_absolute", posts: [expectation, referral, correctedExpectation, correctedReferral], prepared, expectedRejected: ["P1", "P2"] },
  { name: "title_attribution_and_editorial_voice", prepared: prepareEvidence([titlePacket]), expectedRejected: ["P1", "P2"], posts: [
    titlePost,
    { ...titlePost, title: "The Director Praises the Family's Quiet Resilience" },
    { ...titlePost, title: "Jury Praises Quiet Resilience in Award-Winning Documentary" },
    { ...titlePost, title: "Quiet Resilience Deserves a Louder Conversation" },
  ] },
  { name: "unit_selected_support_and_banter", prepared: prepareEvidence([scopePacket]), expectedRejected: ["P1", "P2"],
    posts: [scopePost, wrongBody, correctedScope, correctedBody] },
];
// Added after the final live audit; do not claim live success until this suite runs.
const scopeAttribution = prepareEvidence([
  { ...packets[0], id: "population", excerpt: "Researchers surveyed British sports fans about using unofficial streams to watch paywalled sport.\n\nOf those aged 18 to 34, over 70 per cent said they did this regularly." },
  { ...packets[1], id: "narrator", excerpt: "Kiran said price and ease of access were his reasons for using unofficial streams.\n\nThe BBC reported buffering and poor quality on those streams." },
]);
const wrongPopulation = { title: "Over 70% of Adults Aged 18 to 34 Use Unofficial Streams",
  body: "Over 70 per cent of adults aged 18 to 34 regularly use unofficial streams.", evidenceIds: ["S1E2"],
  discussion: [
    { voice: "Take", body: "Numbers travel faster than caveats. I want both on the ticket.", evidenceIds: ["S1E2"] },
    { voice: "Reply", body: "Fair, but precision need not arrive wearing a lab coat.", evidenceIds: ["S1E2"] },
  ] };
const wrongNarrator = { title: "Cheap Streams and an Unpleasant Viewing Experience",
  body: "Kiran said price and ease of access were his reasons for using unofficial streams. The BBC reported buffering and poor quality on those streams.", evidenceIds: ["S2E1", "S2E2"],
  discussion: [
    { voice: "Take", body: "Kiran admitted that the streams buffer and look poor. Cheap does not mean pleasant.", evidenceIds: ["S2E2"] },
    { voice: "Reply", body: "Price can win an argument without winning a beauty contest.", evidenceIds: ["S2E1"] },
  ] };
const correctPopulation = { ...structuredClone(wrongPopulation),
  title: "Over 70% of Surveyed British Sports Fans Aged 18 to 34 Used Unofficial Streams",
  body: "Among surveyed British sports fans aged 18 to 34, over 70 per cent said they regularly used unofficial streams to watch paywalled sport.", evidenceIds: ["S1E1", "S1E2"] };
const correctNarrator = structuredClone(wrongNarrator);
correctNarrator.discussion[0].body = "The BBC reports that the streams buffer and look poor. Cheap does not mean pleasant.";
suites.push({ name: "population_antecedents_and_reporter_attribution", prepared: scopeAttribution,
  expectedRejected: ["P1", "P2"], posts: [wrongPopulation, wrongNarrator, correctPopulation, correctNarrator] });
const started = Date.now();
const apiKey = getApiKey();
const results = [];
for (const suite of suites) {
  for (const post of suite.posts) for (const id of [...post.evidenceIds, ...(post.discussion ?? []).flatMap(turn => turn.evidenceIds)]) {
    if (!suite.prepared.evidenceById.has(id)) throw new Error("Synthetic control has an unknown evidence ID");
  }
  const result = await reviewEditorial({ apiKey, posts: suite.posts, prepared: suite.prepared,
    maxAttempts: 2, deadlineMs: started + 15 * 60_000,
    onAttempt: info => logEditorialAttempt(info, apiKey, Date.now() - started),
  });
  const rejected = result.value.posts.filter(post => post.checks.some(check => check.verdict === "reject")).map(post => post.key).sort();
  const passed = JSON.stringify(rejected) === JSON.stringify(suite.expectedRejected);
  results.push({ name: suite.name, requestedModel: result.requestedModel, resolvedModel: result.resolvedModel, attempts: result.attempts,
    expectedRejected: suite.expectedRejected, actualRejected: rejected, passed, decisions: result.value });
  console.log(`[review check] suite=${suite.name} passed=${passed} expected=${suite.expectedRejected.join(",")} actual=${rejected.join(",")}`);
}
const passed = results.every(result => result.passed);
const record = { schemaVersion: 4, synthetic: true, scope: "Eight deliberately wrong controls and eight supported or opinionated counterparts across four bounded suites; no publication.",
  elapsedMs: Date.now() - started, passed, suites: results };
// Fixed bounded diagnostic artifact, not raw completion/reading context.
const serialized = JSON.stringify(record, null, 2).split(apiKey).join("[REDACTED]")
  .replace(/Bearer\s+[^\s"',;]+/gi, "Bearer [REDACTED]").replace(/sk-or-[\w-]+/g, "[REDACTED]");
if (Buffer.byteLength(serialized) > 96 * 1024) throw new Error("Review check exceeds artifact bound");
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/editorial-review-check.json", serialized + "\n");
console.log(`[review check] passed=${passed} elapsedMs=${record.elapsedMs}`);
if (!passed) process.exitCode = 1;
