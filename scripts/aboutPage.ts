import { escapeHtml as escape } from "../shared/seo";
import { TOPICS, topicLabel, topicPath } from "../shared/topics";
import { feedPath } from "./feeds";

export const ABOUT_TITLE = "How CoBanter works";
export const ABOUT_DESCRIPTION = "Where CoBanter's articles come from, what its automated source checks do and don't prove, and how to follow along.";

/**
 * Keep these claims aligned with AGENTS.md: provenance checks and model review
 * are fallible, and discussion voices are generated perspectives, not people.
 */
export function aboutMarkup(base: string): string {
  const topics = TOPICS.map(topic => `<a href="${escape(topicPath(topic, base))}">${escape(topicLabel(topic))}</a>`).join(", ");
  const feeds = TOPICS.map(topic => `<li><a href="${escape(feedPath(topic, base))}">${escape(topicLabel(topic))}</a></li>`).join("");
  return `<article class="prose">
<h1>${ABOUT_TITLE}</h1>
<p class="lede">CoBanter is a reading feed for curious people: news, explainers, true stories and a little back-and-forth. Every article starts from a real publisher and links back to it.</p>
<p>Topics: ${topics}.</p>

<h2>Where articles come from</h2>
<p>Articles start from a fixed list of publisher feeds, including the BBC, CBC, The Guardian, NASA, Ars Technica, MIT News, Aeon and JSTOR Daily. There is also a curated shelf of lasting reference reading, such as the Stanford Encyclopedia of Philosophy. Nothing is invented as a fallback. If no suitable sources arrive, the feed simply waits.</p>
<p>An AI model writes each title, body and discussion from those sources. The writing is AI-generated and labelled that way. Every article lists its original sources so you can read them in full.</p>

<h2>What the checks do — and don't</h2>
<ul>
<li><strong>Source provenance.</strong> Factual sentences must cite numbered excerpts taken verbatim from the attached publisher text. Code checks that those excerpts exist, that links point to the publisher's own site, and that news sources are no more than 72 hours old.</li>
<li><strong>Separate review.</strong> Since October 2026, before publication, another AI pass reads every title, body and discussion turn against the sources. It withholds whole posts it finds unsupported or misattributed.</li>
<li><strong>The limit.</strong> These checks establish where text came from. They are not human fact-checking, and mistakes can still slip through. Treat the linked originals as the authority.</li>
</ul>

<h2>The AI discussion</h2>
<p>Most articles end with two to four short turns labelled Take, Pushback, Reply or Context. These are AI-written perspectives meant to add an interpretation, a challenge or a joke. They are not real people, readers or eyewitnesses. CoBanter shows no simulated likes, views or commenters.</p>

<h2>Dates</h2>
<p><strong>Added</strong> is when an article appeared on CoBanter. <strong>Published</strong> is each source's own publication date. When a source has no reliable date, it stays marked as unavailable rather than guessed. Older reading is not necessarily current news.</p>

<h2>Spoilers</h2>
<p>Articles about films and TV that discuss plot details hide their text and discussion until you choose to reveal them. Their titles are written to be spoiler-safe.</p>

<h2>Corrections and permanence</h2>
<p>When an error is found, the article is corrected through the same validated publishing step. It keeps its permanent link. Articles are never deleted for age. The complete <a href="${base}archive/">article archive</a> links to all of them.</p>

<h2>Follow along</h2>
<p>Subscribe in any feed reader with the <a href="${escape(feedPath("", base))}">CoBanter RSS feed</a>, or follow a single topic:</p>
<ul class="feed-list-links">${feeds}</ul>
<p>For quick browsing, try <a href="${base}?view=cards">Cards</a>, which shows one article at a time.</p>
</article>`;
}
