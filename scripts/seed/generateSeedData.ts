import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AccountsFileSchema,
  BatchFileSchema,
  FeedItemSchema,
  ManifestSchema,
  type Account,
  type BatchRef,
  type Comment,
  type Engagement,
  type FeedItem,
  type FeedItemKind,
  type Manifest,
} from "../../schemas";
import { SEED_PERSONAS, type SeedPersona } from "./accounts.data";
import {
  announcement,
  applyVoice,
  commentBody,
  communityPost,
  discussion,
  hotTake,
  joke,
  linkPreview,
  maybe,
  observation,
  personalAnecdote,
  pick,
  question,
  reaction,
  repost,
  textPost,
  type Rng,
} from "./content-templates";

// Fixed seed keeps this checked-in sample data fully reproducible: re-running `pnpm seed`
// produces byte-for-byte identical output until this file changes.
const SEED = 1337;

function mulberry32(seed: number): Rng {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(SEED);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(HERE, "../../public/data");
const BATCHES_DIR = path.join(OUTPUT_DIR, "batches");

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NOW = Date.now();

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter.toString(36)}`;
}

// --- Accounts -----------------------------------------------------------

function buildAccounts(): { accounts: Account[]; idByHandle: Map<string, string> } {
  const idByHandle = new Map(SEED_PERSONAS.map((p) => [p.handle, `acc-${p.handle}`]));
  const genesis = NOW - 10 * DAY_MS;

  const accounts: Account[] = SEED_PERSONAS.map((persona) => ({
    id: idByHandle.get(persona.handle)!,
    handle: persona.handle,
    displayName: persona.displayName,
    bio: persona.bio,
    personalityTraits: persona.personalityTraits,
    interests: persona.interests,
    writingStyle: persona.writingStyle,
    communities: persona.communities,
    behavioralTendencies: persona.behavioralTendencies,
    relationships: persona.relationships.map((r) => ({
      accountId: idByHandle.get(r.handle)!,
      type: r.type,
    })),
    activityLevel: persona.activityLevel,
    createdAt: new Date(genesis + rng() * 2 * DAY_MS).toISOString(),
  }));

  return { accounts, idByHandle };
}

// --- Engagement synthesis -------------------------------------------------

const ACTIVITY_WEIGHT: Record<SeedPersona["activityLevel"], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function pickAuthor(rng: Rng, personas: SeedPersona[]): SeedPersona {
  const weighted: SeedPersona[] = [];
  for (const p of personas) {
    for (let i = 0; i < ACTIVITY_WEIGHT[p.activityLevel]; i++) weighted.push(p);
  }
  return pick(rng, weighted);
}

const KIND_WEIGHTS: Array<[FeedItemKind, number]> = [
  ["text_post", 18],
  ["discussion", 10],
  ["joke", 12],
  ["observation", 10],
  ["hot_take", 8],
  ["question", 8],
  ["personal_anecdote", 10],
  ["community_post", 6],
  ["announcement", 3],
  ["link_preview", 5],
  ["reaction", 5],
  ["repost", 5],
];

function pickKind(rng: Rng, allowReferencing: boolean): FeedItemKind {
  const pool = allowReferencing
    ? KIND_WEIGHTS
    : KIND_WEIGHTS.filter(([kind]) => kind !== "reaction" && kind !== "repost");
  const total = pool.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [kind, weight] of pool) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return pool[0][0];
}

interface EngagementInput {
  kind: FeedItemKind;
  ageHours: number;
  isViral: boolean;
  replyCount: number;
}

function synthesizeEngagement(rng: Rng, input: EngagementInput): Engagement {
  const ageFactor = Math.min(1, input.ageHours / (3 * DAY_MS / HOUR_MS));
  const baseline = 5 + rng() * 40;
  const viralMultiplier = input.isViral ? 15 + rng() * 35 : 1;

  const likes = Math.round(baseline * (0.4 + ageFactor) * viralMultiplier * (0.6 + rng() * 0.8));
  const reposts = Math.round(likes * (0.05 + rng() * 0.15));
  const views = Math.round(likes * (6 + rng() * 10));
  const viralityScore = input.isViral
    ? Math.min(1, 0.7 + rng() * 0.3)
    : Math.min(0.6, rng() * 0.25);

  return {
    likes,
    reposts,
    replies: input.replyCount,
    views,
    viralityScore: Math.round(viralityScore * 100) / 100,
  };
}

// --- Comments -------------------------------------------------------------

function pickReplyCount(rng: Rng): number {
  const roll = rng();
  if (roll < 0.35) return 0;
  if (roll < 0.7) return Math.floor(rng() * 5);
  if (roll < 0.92) return 5 + Math.floor(rng() * 15);
  if (roll < 0.98) return 20 + Math.floor(rng() * 40);
  return 80 + Math.floor(rng() * 60); // rare viral thread
}

function buildComments(
  rng: Rng,
  count: number,
  personas: SeedPersona[],
  authorHandle: string,
): Comment[] {
  const comments: Comment[] = [];
  const commenterPool = personas.filter((p) => p.handle !== authorHandle);
  if (commenterPool.length === 0 || count === 0) return comments;

  for (let i = 0; i < count; i++) {
    const commenter = pickAuthor(rng, commenterPool);
    const agree = maybe(rng, 1 - commenter.behavioralTendencies.controversialTake * 0.7);
    const parent =
      comments.length > 0 && maybe(rng, 0.3) ? pick(rng, comments) : undefined;

    comments.push({
      id: nextId("cmt"),
      authorId: `acc-${commenter.handle}`,
      createdAt: new Date(NOW - rng() * HOUR_MS).toISOString(),
      body: applyVoice(commentBody(commenter, rng, agree), commenter, rng),
      parentCommentId: parent?.id,
      engagement: { likes: Math.round(rng() * (parent ? 15 : 60)) },
    });
  }

  return comments;
}

// --- Feed items -------------------------------------------------------------

function generateItemContent(
  persona: SeedPersona,
  kind: FeedItemKind,
  rng: Rng,
  community: string,
  referencedItem?: FeedItem,
): { title?: string; body: string; meta: FeedItem["meta"] } {
  switch (kind) {
    case "question": {
      const r = question(persona, rng);
      return { body: applyVoice(r.body, persona, rng), meta: { kind: "generic" } };
    }
    case "discussion": {
      const r = discussion(persona, rng);
      return {
        title: r.title,
        body: applyVoice(r.body, persona, rng),
        meta: { kind: "generic" },
      };
    }
    case "hot_take": {
      const r = hotTake(persona, rng);
      return { body: applyVoice(r.body, persona, rng), meta: { kind: "generic" } };
    }
    case "observation": {
      const r = observation(persona, rng);
      return { body: applyVoice(r.body, persona, rng), meta: { kind: "generic" } };
    }
    case "personal_anecdote": {
      const r = personalAnecdote(persona, rng);
      return { body: applyVoice(r.body, persona, rng), meta: { kind: "generic" } };
    }
    case "joke": {
      const r = joke(persona, rng);
      return { body: applyVoice(r.body, persona, rng), meta: { kind: "generic" } };
    }
    case "community_post": {
      const r = communityPost(persona, rng, community);
      return { body: applyVoice(r.body, persona, rng), meta: { kind: "generic" } };
    }
    case "announcement": {
      const r = announcement(persona, rng);
      return { body: applyVoice(r.body, persona, rng), meta: { kind: "generic" } };
    }
    case "link_preview": {
      const r = linkPreview(persona, rng);
      return {
        body: applyVoice(r.body, persona, rng),
        meta: {
          kind: "link_preview",
          url: r.url,
          domain: r.domain,
          linkTitle: r.linkTitle,
          linkDescription: r.linkDescription,
        },
      };
    }
    case "reaction": {
      const snippet = referencedItem?.body ?? "something someone said";
      const r = reaction(persona, rng, snippet);
      return { body: applyVoice(r.body, persona, rng), meta: { kind: "reaction" } };
    }
    case "repost": {
      const snippet = referencedItem?.body ?? "something someone said";
      const r = repost(persona, rng, snippet);
      return { body: applyVoice(r.body, persona, rng), meta: { kind: "repost" } };
    }
    case "text_post":
    default: {
      const r = textPost(persona, rng);
      return { body: applyVoice(r.body, persona, rng), meta: { kind: "generic" } };
    }
  }
}

function generateFeedItem(
  rng: Rng,
  personas: SeedPersona[],
  createdAt: Date,
  isViral: boolean,
  earlierItems: FeedItem[],
): FeedItem {
  const author = pickAuthor(rng, personas);
  const canReference = earlierItems.length > 0;
  const kind = pickKind(rng, canReference);
  const community = pick(rng, author.communities);
  const referencedItem =
    (kind === "repost" || kind === "reaction") && canReference
      ? pick(rng, earlierItems)
      : undefined;

  const content = generateItemContent(author, kind, rng, community, referencedItem);
  const ageHours = (NOW - createdAt.getTime()) / HOUR_MS;
  const replyCount = pickReplyCount(rng);
  const comments = buildComments(rng, replyCount, personas, author.handle);

  return FeedItemSchema.parse({
    id: nextId("post"),
    kind,
    authorId: `acc-${author.handle}`,
    createdAt: createdAt.toISOString(),
    community,
    title: content.title,
    body: content.body,
    referencedPostId: referencedItem?.id,
    meta: content.meta,
    engagement: synthesizeEngagement(rng, { kind, ageHours, isViral, replyCount: comments.length }),
    comments,
  });
}

interface BatchPlan {
  id: string;
  windowStartHoursAgo: number;
  windowEndHoursAgo: number;
  itemCount: number;
}

// Newest batch first in the manifest; oldest batch is generated first here so that
// newer batches can reference (repost/react to) genuinely older posts as callbacks.
const BATCH_PLANS: BatchPlan[] = [
  { id: "batch-0003", windowStartHoursAgo: 10 * 24, windowEndHoursAgo: 9 * 24, itemCount: 55 },
  { id: "batch-0002", windowStartHoursAgo: 3.75 * 24, windowEndHoursAgo: 3 * 24, itemCount: 60 },
  { id: "batch-0001", windowStartHoursAgo: 18, windowEndHoursAgo: 0, itemCount: 65 },
];

function generateBatch(
  plan: BatchPlan,
  personas: SeedPersona[],
  allEarlierItems: FeedItem[],
): FeedItem[] {
  const items: FeedItem[] = [];
  const viralIndexes = new Set(
    Array.from({ length: Math.max(1, Math.round(plan.itemCount * 0.04)) }, () =>
      Math.floor(rng() * plan.itemCount),
    ),
  );

  for (let i = 0; i < plan.itemCount; i++) {
    const hoursAgo =
      plan.windowStartHoursAgo - rng() * (plan.windowStartHoursAgo - plan.windowEndHoursAgo);
    const createdAt = new Date(NOW - hoursAgo * HOUR_MS);
    const item = generateFeedItem(
      rng,
      personas,
      createdAt,
      viralIndexes.has(i),
      [...allEarlierItems, ...items],
    );
    items.push(item);
  }

  // Newest-first within the batch file itself, matching manifest ordering conventions.
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items;
}

// --- Main -------------------------------------------------------------------

function main() {
  mkdirSync(BATCHES_DIR, { recursive: true });

  const { accounts } = buildAccounts();
  const accountsFile = AccountsFileSchema.parse(accounts);

  const allItems: FeedItem[] = [];
  const batchRefs: BatchRef[] = [];

  for (const plan of BATCH_PLANS) {
    const items = generateBatch(plan, SEED_PERSONAS, allItems);
    allItems.push(...items);

    const generatedAt = new Date(NOW - plan.windowEndHoursAgo * HOUR_MS).toISOString();
    const batchFile = BatchFileSchema.parse({
      batchId: plan.id,
      generatedAt,
      items,
    });

    writeFileSync(
      path.join(BATCHES_DIR, `${plan.id}.json`),
      `${JSON.stringify(batchFile, null, 2)}\n`,
    );

    batchRefs.push({
      id: plan.id,
      generatedAt,
      file: `batches/${plan.id}.json`,
      itemCount: items.length,
    });
  }

  // Manifest lists newest batch first.
  batchRefs.reverse();

  const manifest: Manifest = ManifestSchema.parse({
    schemaVersion: 1,
    generatedAt: new Date(NOW).toISOString(),
    latestRunId: batchRefs[0]?.id ?? "none",
    batches: batchRefs,
  });

  writeFileSync(
    path.join(OUTPUT_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  writeFileSync(
    path.join(OUTPUT_DIR, "accounts.json"),
    `${JSON.stringify(accountsFile, null, 2)}\n`,
  );

  const totalComments = allItems.reduce((sum, item) => sum + item.comments.length, 0);
  console.log(
    `Seeded ${accountsFile.length} accounts, ${allItems.length} posts, ${totalComments} comments across ${batchRefs.length} batches.`,
  );
}

main();
