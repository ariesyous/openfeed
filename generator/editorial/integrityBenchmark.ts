import type { SourcePacket } from "./sources";
import { validateDraft } from "./generate";

/** Reviewed examples, not an automatic semantic judge or historical prompt replay. */
export interface IntegrityExample {
  id: string;
  category: string;
  source: SourcePacket;
  draft: Parameters<typeof validateDraft>[0];
  expectedEditorialDecision: "accept" | "reject";
  deterministicRejection?: "voice" | "provenance";
  reviewReason: string;
}

const reviewedAt = new Date("2026-09-18T20:00:00.000Z");
function source(id: string, title: string, url: string, excerpt: string): SourcePacket {
  return { id, title, url, excerpt, publisher: id === "relationship" ? "BFI" : "NASA",
    topic: id === "relationship" ? "the_sopranos" : "science", evergreen: true,
    retrievedAt: reviewedAt.toISOString() };
}
// Short source passages were rechecked on September 18. Newline-separated passages
// need not be contiguous in the original; they are not a saved generation packet.
const comet = source("comet", "NASA's Hubble Detects First-Ever Spin Reversal of Tiny Comet",
  "https://science.nasa.gov/missions/hubble/nasas-hubble-detects-first-ever-spin-reversal-of-tiny-comet/",
  "The object, comet 41P/Tuttle-Giacobini-Kresák, or 41P for short, likely originated in the Kuiper Belt.\n\n" +
  "the spinning of a small comet slowed and then reversed its direction of rotation");
const crater = source("crater", "NASA’s Moon Orbiter Spots New, ‘Once-in-Century’ Moon Crater",
  "https://science.nasa.gov/solar-system/moon/nasas-moon-orbiter-spots-new-once-in-century-moon-crater/",
  "By comparing before and after images of the Moon, Wagner realized he had discovered the largest, newly formed crater ever found in the solar system\n\n" +
  "after a comet or asteroid the size of a three- to six-story building hit the surface.");
const relationship = source("relationship", "The Many Saints of Newark can't escape the baggage of The Sopranos",
  "https://www.bfi.org.uk/sight-and-sound/reviews/many-saints-newark-cant-escape-baggage-sopranos",
  "The film’s protagonist is Dickie Moltisanti (Alessandro Nivola), Christopher Moltisanti’s father,\n\n" +
  "and “uncle” to Johnny’s son, Tony.");
const curiosity = source("curiosity", "Curiosity Celebrates 10 Years on Mars",
  "https://www.nasa.gov/history/curiosity-celebrates-10-years-on-mars/",
  "For the past 10 years, Curiosity has traversed across the Martian surface, investigating the planet’s geology and climate, assessing the planet’s past habitability. " +
  "Its mission continues, far exceeding its originally-planned one Martian year life expectancy.\n\n" +
  "carrying out these studies for one Martian year, equivalent to 687 Earth days.");

function draft(packet: SourcePacket, title: string, body: string, quotes: string[],
  discussion?: { voice: "Take" | "Pushback" | "Context"; body: string; quote: string | string[] }[]) {
  return { posts: [{ format: "explainer", title, body, sourceIds: [packet.id],
    evidence: quotes.map(quote => ({ sourceId: packet.id, quote })),
    discussion: discussion?.map(({ voice, body: turnBody, quote }) => ({ voice, body: turnBody,
      evidence: (Array.isArray(quote) ? quote : [quote]).map(text => ({ sourceId: packet.id, quote: text })) })) }] };
}
const cometQuotes = ["The object, comet 41P/Tuttle-Giacobini-Kresák, or 41P for short",
  "the spinning of a small comet slowed and then reversed its direction of rotation"];
const craterQuotes = ["images of the Moon, Wagner realized he had discovered the largest, newly formed crater ever found in the solar system",
  "after a comet or asteroid the size of a three- to six-story building hit the surface."];
const relationQuotes = relationship.excerpt.split("\n\n");
const missionQuotes = ["Curiosity has traversed across the Martian surface, investigating the planet’s geology and climate, assessing the planet’s past habitability.",
  "Its mission continues, far exceeding its originally-planned one Martian year life expectancy.",
  "carrying out these studies for one Martian year, equivalent to 687 Earth days."];
const missionBody = "Curiosity's originally planned mission lasted one Martian year, equivalent to 687 Earth days.";

// First ordinary post-WP1 edition: two short, rechecked source passages.
// These remain semantic review examples, not claims of automated detection.
const production = { ...source("production", "Business Cycle Indicators: Industrial, Manufacturing Production under Consensus",
  "https://econbrowser.com/archives/2026/09/business-cycle-indicators-industrial-manufacturing-production-under-consensus",
  "While industrial production was flat, manufacturing fell noticeably."), publisher: "Econbrowser", topic: "economics" };
const profits = { ...source("profits", "EJ Antoni: Manufacturing profits soar on Trump reforms",
  "https://econbrowser.com/archives/2026/09/ej-antoni-manufacturing-profits-soar-on-trump-reforms-end-iran-war-to-keep-boom-going",
  "Dr. Antoni is writing about corporate net income after tax.\n\n" +
  "doesn’t mean underlying productivity is higher."), publisher: "Econbrowser", topic: "economics" };

// Post-42 manual edition: short retained support, not full historical prompts.
const growth = { ...source("growth", "GDPNow Goes Gangbusters",
  "https://econbrowser.com/archives/2026/09/gdpnow-goes-gangbusters",
  "GDPNow as of today is 5.1% q/q AR for Q3:\n\n" +
  "the just released FT-Booth forecast , for 2% q4/q4 growth"), publisher: "Econbrowser", topic: "economics" };
const neurons = { ...source("neurons", "Finding the cells that put our brain to sleep",
  "https://arstechnica.com/science/2026/09/finding-the-cells-that-put-our-brain-to-sleep/",
  "These cortical cells make up only around one percent of the cortex's inhibitory neurons"), publisher: "Ars Technica" };
const rivalry = { ...source("rivalry", "Public Goods",
  "https://plato.stanford.edu/entries/public-goods/",
  "A good is rivalrous if and only if an individual’s consumption of it diminishes others’ ability to consume it."),
  publisher: "Stanford Encyclopedia of Philosophy", topic: "economics" };
const asteroids = source("asteroids", "Asteroids",
  "https://science.nasa.gov/solar-system/asteroids/",
  "Asteroids range in size from Vesta – the largest at about 329 miles (530 kilometers) in diameter");

export const INTEGRITY_EXAMPLES: IntegrityExample[] = [
  { id: "comet-entity-wrong", category: "entity", source: comet,
    draft: draft(comet, "Hubble detects a comet's spin reversal", "Hubble observations show that comet 3I/ATLAS slowed and reversed its spin.", cometQuotes),
    expectedEditorialDecision: "reject", reviewReason: "The cited finding identifies 41P, not 3I/ATLAS. A genuine quote about 41P cannot support a sentence about another comet." },
  { id: "comet-entity-supported", category: "entity", source: comet,
    draft: draft(comet, "Hubble detects a comet's spin reversal", "Hubble observations provide evidence that comet 41P slowed and then reversed its spin.", cometQuotes),
    expectedEditorialDecision: "accept", reviewReason: "The subject and finding stay together; the sentence retains the evidential qualification." },
  { id: "crater-scope-wrong", category: "quantity-and-qualifier", source: crater,
    draft: draft(crater, "A huge lunar impact", "A mountain-sized rock made the largest crater ever found in the solar system.", craterQuotes),
    expectedEditorialDecision: "reject", reviewReason: "The newly formed qualifier was dropped and the impactor was inflated from a building to a mountain." },
  { id: "crater-scope-supported", category: "quantity-and-qualifier", source: crater,
    draft: draft(crater, "An unusually large new lunar crater", "NASA describes the largest newly formed crater found in the solar system, made by an impactor the size of a three- to six-story building.", craterQuotes),
    expectedEditorialDecision: "accept", reviewReason: "Both the comparison class and impactor scale are preserved." },
  { id: "family-relationship-wrong", category: "relationship", source: relationship,
    draft: draft(relationship, "Dickie's place in the family", "Dickie is Christopher Moltisanti's father and an uncle to Tony Soprano's son.", relationQuotes),
    expectedEditorialDecision: "reject", reviewReason: "The review describes an uncle to Johnny's son Tony, not to Tony's son." },
  { id: "family-relationship-supported", category: "relationship", source: relationship,
    draft: draft(relationship, "Dickie's place in the family", "Dickie is Christopher Moltisanti's father and an uncle figure to Johnny's son, Tony.", relationQuotes),
    expectedEditorialDecision: "accept", reviewReason: "The parent/child relationship and uncle role match the cited review." },
  { id: "discussion-background-wrong", category: "discussion", source: curiosity,
    draft: draft(curiosity, "Curiosity's original mission", missionBody, missionQuotes, [
      { voice: "Take", body: "Curiosity was designed for a mission of only 90 sols.", quote: missionQuotes },
      { voice: "Context", body: "A mission's original plan is a useful benchmark for its longevity.", quote: missionQuotes },
    ]), expectedEditorialDecision: "reject", reviewReason: "A correct parent does not make discussion factual: the 90-sol claim contradicts the one-Martian-year plan." },
  { id: "discussion-background-supported", category: "discussion", source: curiosity,
    draft: draft(curiosity, "Curiosity's original mission", missionBody, missionQuotes, [
      { voice: "Take", body: "The original plan was one Martian year, or 687 Earth days.", quote: missionQuotes },
      { voice: "Context", body: "The planned duration gives us a concrete benchmark when discussing longevity.", quote: missionQuotes },
    ]), expectedEditorialDecision: "accept", reviewReason: "Discussion retains the original unit, number and distinction between planned duration and actual lifetime." },
  { id: "process-commentary", category: "voice", source: comet,
    draft: draft(comet, "A comet changes direction", "The excerpt does not say enough to explain why the comet reversed its spin.", cometQuotes),
    expectedEditorialDecision: "reject", deterministicRejection: "voice",
    reviewReason: "Narrating input limitations is not finished editorial copy; absence from a packet is not proof of real-world uncertainty." },
  { id: "second-quote-fabricated", category: "provenance", source: comet,
    draft: draft(comet, "A comet changes direction", "Hubble found evidence of a spin reversal in comet 41P.", [cometQuotes[0], "The comet was observed by imaginary instruments."]),
    expectedEditorialDecision: "reject", deterministicRejection: "provenance",
    reviewReason: "Every selected quotation must exist in its attached source, including a second quote from the same source." },
  { id: "attributed-uncertainty", category: "uncertainty", source: comet,
    draft: draft(comet, "A likely origin for comet 41P", "NASA describes comet 41P as likely to have originated in the Kuiper Belt.",
      ["comet 41P/Tuttle-Giacobini-Kresák, or 41P for short, likely originated in the Kuiper Belt"]),
    expectedEditorialDecision: "accept", reviewReason: "Attribution and uncertainty are about the finding and are explicit in the source, not manufactured from missing input." },
  { id: "grounded-commentary", category: "commentary", source: curiosity,
    draft: draft(curiosity, "The mission plan is a starting line", "Curiosity's original plan was one Martian year, or 687 Earth days. A mission plan is a useful yardstick, not an expiry date.", missionQuotes),
    expectedEditorialDecision: "accept", reviewReason: "The second sentence is an interpretation of the supported plan, not a fabricated engineering specification or process complaint." },
  { id: "live-unrelated-source-wrong", category: "source-subject", source: production,
    draft: draft(production, "Two profit measures", "After-tax profits surged while adjusted pre-tax profits barely changed.", [production.excerpt]),
    expectedEditorialDecision: "reject", reviewReason: "Post 2 in the first ordinary edition used production evidence for a profit claim. Same publisher and valid IDs do not establish support." },
  { id: "live-unrelated-source-supported", category: "source-subject", source: production,
    draft: draft(production, "Production measures diverge", "Econbrowser reports flat industrial production alongside a decline in manufacturing production.", [production.excerpt]),
    expectedEditorialDecision: "accept", reviewReason: "The claim stays within the supplied production comparison." },
  { id: "live-speaker-attribution-wrong", category: "speaker-attribution", source: profits,
    draft: draft(profits, "What the profit figure means", "Antoni cautions that higher after-tax income does not mean underlying productivity is higher.", profits.excerpt.split("\n\n")),
    expectedEditorialDecision: "reject", reviewReason: "The rechecked article identifies Antoni as the subject of the critique; the productivity qualification belongs to Econbrowser's author. This reproduces post 10's attribution reversal." },
  { id: "live-speaker-attribution-supported", category: "speaker-attribution", source: profits,
    draft: draft(profits, "What the profit figure means", "Econbrowser's author critiques Antoni's focus on after-tax income and cautions that it does not establish higher underlying productivity.", profits.excerpt.split("\n\n")),
    expectedEditorialDecision: "accept", reviewReason: "The source subject and the author making the qualification remain distinct; reviewed against the linked article, not inferred by an automated judge." },
  { id: "manual-growth-periods-wrong", category: "comparison-period", source: growth,
    draft: draft(growth, "Why the forecasts disagree", "The 5.1 percent and 2 percent figures measure the same period, so their gap proves the methods disagree.", growth.excerpt.split("\n\n")),
    expectedEditorialDecision: "reject", reviewReason: "The post-42 edition compared Q3 annualized quarter growth with Q4-over-Q4 growth. Different time bases do not establish a model disagreement." },
  { id: "manual-growth-periods-supported", category: "comparison-period", source: growth,
    draft: draft(growth, "Growth rates need time periods", "GDPNow's 5.1 percent is Q3 annualized quarter-over-quarter growth; FT-Booth's 2 percent is fourth-quarter-over-fourth-quarter growth. The rates describe different spans.", growth.excerpt.split("\n\n")),
    expectedEditorialDecision: "accept", reviewReason: "Retains each estimate's time basis without inventing a cause for a numeric difference." },
  { id: "manual-title-denominator-wrong", category: "title-denominator", source: neurons,
    draft: draft(neurons, "One percent of the cortex", "The reported population makes up around one percent of the cortex's inhibitory neurons.", [neurons.excerpt]),
    expectedEditorialDecision: "reject", reviewReason: "A correct body does not repair a title that drops the inhibitory-neuron denominator." },
  { id: "manual-title-denominator-supported", category: "title-denominator", source: neurons,
    draft: draft(neurons, "A small population of inhibitory neurons", "The reported population makes up around one percent of the cortex's inhibitory neurons.", [neurons.excerpt]),
    expectedEditorialDecision: "accept", reviewReason: "The title and body retain the population distinction without implying a share of total cortex volume." },
  { id: "manual-nonrival-price-wrong", category: "concept-distinction", source: rivalry,
    draft: draft(rivalry, "Non-rival goods cost nothing", "If a good is non-rival, another person can consume it at no cost.", [rivalry.excerpt]),
    expectedEditorialDecision: "reject", reviewReason: "Non-rivalry concerns undiminished consumption, not a zero price or absence of delivery costs." },
  { id: "manual-nonrival-price-supported", category: "concept-distinction", source: rivalry,
    draft: draft(rivalry, "Consumption without subtraction", "With a non-rival good, one person's consumption does not diminish another person's ability to consume it.", [rivalry.excerpt]),
    expectedEditorialDecision: "accept", reviewReason: "The explanation retains the source's consumption criterion instead of importing a claim about price." },
  { id: "manual-asteroid-class-wrong", category: "comparison-class", source: asteroids,
    draft: draft(asteroids, "The largest body in the belt", "NASA identifies Vesta as the largest body in the asteroid belt.", [asteroids.excerpt]),
    expectedEditorialDecision: "reject", reviewReason: "The source describes the asteroid category, not every body in the belt; the original article widened that comparison class." },
  { id: "manual-asteroid-class-supported", category: "comparison-class", source: asteroids,
    draft: draft(asteroids, "Vesta gives the size range a scale", "NASA puts Vesta's diameter at about 530 kilometers.", [asteroids.excerpt]),
    expectedEditorialDecision: "accept", reviewReason: "Retains the supported dimension and approximate value without broadening the superlative." },
];

export function reviewIntegrityBenchmark() {
  return INTEGRITY_EXAMPLES.map(example => {
    const result = validateDraft(example.draft, [example.source], reviewedAt);
    return { id: example.id, expectedEditorialDecision: example.expectedEditorialDecision,
      deterministicGate: result.ok ? "passes; semantic review still required" : "rejects",
      issues: result.ok ? [] : result.issues, reviewReason: example.reviewReason };
  });
}
