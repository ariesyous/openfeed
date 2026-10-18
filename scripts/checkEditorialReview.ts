import { mkdirSync, writeFileSync } from "node:fs";
import { getApiKey, loadEnvFile } from "../generator/env";
import { logEditorialAttempt } from "../generator/editorial/diagnostics";
import { prepareEvidence } from "../generator/editorial/evidence";
import { reviewEditorial } from "../generator/editorial/review";
import type { SourcePacket } from "../generator/editorial/sources";

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
const started = Date.now();
const apiKey = getApiKey();
const result = await reviewEditorial({ apiKey, posts: [expectation, referral, correctedExpectation, correctedReferral], prepared,
  maxAttempts: 2, deadlineMs: started + 15 * 60_000,
  onAttempt: info => logEditorialAttempt(info, apiKey, Date.now() - started),
});
const rejected = result.value.posts.filter(post => post.checks.some(check => check.verdict === "reject")).map(post => post.key).sort();
const passed = JSON.stringify(rejected) === JSON.stringify(["P1", "P2"]);
const record = { schemaVersion: 1, synthetic: true, scope: "Two deliberately wrong controls and two corrected counterparts with opinion and metaphor; no publication.",
  requestedModel: result.requestedModel, resolvedModel: result.resolvedModel, attempts: result.attempts,
  elapsedMs: Date.now() - started, expectedRejected: ["P1", "P2"], actualRejected: rejected, passed, decisions: result.value };
// Fixed bounded diagnostic artifact, not raw completion/reading context.
const serialized = JSON.stringify(record, null, 2).split(apiKey).join("[REDACTED]")
  .replace(/Bearer\s+[^\s"',;]+/gi, "Bearer [REDACTED]").replace(/sk-or-[\w-]+/g, "[REDACTED]");
if (Buffer.byteLength(serialized) > 64 * 1024) throw new Error("Review check exceeds artifact bound");
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/editorial-review-check.json", serialized + "\n");
console.log(`[review check] passed=${passed} expected=P1,P2 actual=${rejected.join(",")} attempts=${result.attempts} elapsedMs=${record.elapsedMs}`);
if (!passed) process.exitCode = 1;
