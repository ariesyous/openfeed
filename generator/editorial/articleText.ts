import { parse, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
const children = (node: Node): Node[] => "childNodes" in node ? node.childNodes : [];
const attribute = (node: Node, name: string) => "attrs" in node ? node.attrs.find(a => a.name === name)?.value ?? "" : "";
const hasClass = (node: Node, value: string) => attribute(node, "class").split(/\s+/).includes(value);
const ignoredTags = new Set(["script", "style", "nav", "header", "footer", "aside", "form", "figure", "figcaption", "noscript", "button", "template"]);
const ignored = (node: Node) => ignoredTags.has(node.nodeName) ||
  /(?:^|[\s_-])(?:related|teaser|card|promo|recommendations?|newsletter|social|share|caption|byline)(?:[\s_-]|$)/i
    .test(`${attribute(node, "class")} ${attribute(node, "id")}`);
const bodyMarkers: Record<string, (node: Node) => boolean> = {
  "CBC Canada": node => hasClass(node, "story") && node.nodeName === "div",
  "PBS NewsHour": node => hasClass(node, "body-text"),
  "NPR": node => attribute(node, "id") === "storytext",
  "Psyche": node => hasClass(node, "article-content") && hasClass(node, "text-copy"),
  "Variety Film": node => hasClass(node, "a-content") && hasClass(node, "a-content--logo-end"),
  "BBC": node => node.nodeName === "article",
  "MIT News": node => node.nodeName === "div" && hasClass(node, "news-article--content--body--inner"),
  "Ars Technica": node => node.nodeName === "article" && hasClass(node, "h-entry"),
  "Aeon": node => node.nodeName === "div" && attribute(node, "id") === "article-content" && hasClass(node, "article-content"),
  "JSTOR Daily": node => node.nodeName === "div" && hasClass(node, "entry-content"),
  // Inspected October 22: pull quotes are asides, images figures, credits a footer.
  "The Guardian": node => node.nodeName === "div" && hasClass(node, "article-body-commercial-selector") && hasClass(node, "article-body-viewer-selector"),
  // Inspected October 23: one styled-component text container of text-block slices.
  "BFI": node => node.nodeName === "div" && attribute(node, "class").split(/\s+/).some(name => name.startsWith("EmbeddedArticleText__TextContent-sc-")),
  "Antigone": node => node.nodeName === "div" && hasClass(node, "entry-content"),
};
// Module slices and inline footnote markers that are not article prose.
const publisherIgnored: Record<string, (node: Node) => boolean> = {
  "JSTOR Daily": node => hasClass(node, "daily_email_signup"),
  "Aeon": node => hasClass(node, "pullquote"),
  "BFI": node => ["call_to_action_block", "article_grid_block", "block_quote_slice"].some(name => hasClass(node, name)),
  // Antigone's medium-size paragraphs are bylines and subheadings; they bound sections.
  "Antigone": node => ["footnote_referrer", "printfriendly", "sharedaddy", "footnotes_reference_container"].some(name => hasClass(node, name)) ||
    (node.nodeName === "p" && hasClass(node, "has-medium-font-size")),
};
export const hasArticleAdapter = (publisher: string) => Boolean(bodyMarkers[publisher.startsWith("BBC") ? "BBC" : publisher]);

/** Explicit publisher bodies, not a general readability scraper. No scripts execute. */
export function sourceArticleSections(html: string, publisher: string): string[] {
  if (Buffer.byteLength(html, "utf8") > 1_000_000) return [];
  const cleaned = html.replace(/<!doctype\s+html\s*>/gi, "");
  if (/<!DOCTYPE|<!ENTITY/i.test(cleaned)) return [];
  const marker = bodyMarkers[publisher.startsWith("BBC") ? "BBC" : publisher];
  if (!marker) return [];
  const isIgnored = (node: Node) => ignored(node) || Boolean(publisherIgnored[publisher]?.(node));
  const roots: Node[] = [];
  const find = (node: Node) => {
    if (isIgnored(node)) return;
    if (marker(node)) { roots.push(node); return; }
    children(node).forEach(find);
  };
  find(parse(cleaned));
  if (roots.length !== 1) return [];
  const text = (node: Node): string => {
    if (isIgnored(node)) return "";
    if ("value" in node && node.nodeName === "#text") return node.value;
    if (node.nodeName === "br") return " ";
    return children(node).map(text).join("");
  };
  const sections: string[][] = [[]];
  const boundary = () => { if (sections.at(-1)!.length) sections.push([]); };
  const walk = (node: Node) => {
    const tag = node.nodeName;
    if (isIgnored(node) || tag === "article") { boundary(); return; }
    if (/^h[1-6]$/.test(tag) || tag === "section") boundary();
    if (tag === "p") {
      const paragraph = text(node).replace(/\s+/g, " ").trim();
      // Inline WATCH/READ MORE links and BFI's "► … in cinemas" availability
      // notices are separate modules, not supporting prose.
      if (/^(?:WATCH|READ MORE|LISTEN):/i.test(paragraph) || /^►/.test(paragraph) || /(?:…|\.\.\.)[”"')\]]?$/.test(paragraph)) boundary();
      else if (paragraph) sections.at(-1)!.push(paragraph);
    } else children(node).forEach(walk);
    if (tag === "section") boundary();
  };
  // The inspected essay text is inside one inner block: Aeon's has-dropcap div
  // (audio-player labels beside it are not prose) and Antigone's pf-content div
  // (sharing buttons and the footnote table beside it are not prose).
  const innerBody: Record<string, string> = { "Aeon": "has-dropcap", "Antigone": "pf-content" };
  if (innerBody[publisher]) {
    const bodies: Node[] = [];
    const findBody = (node: Node) => {
      if (isIgnored(node)) return;
      if (node.nodeName === "div" && hasClass(node, innerBody[publisher])) { bodies.push(node); return; }
      children(node).forEach(findBody);
    };
    children(roots[0]).forEach(findBody);
    if (bodies.length !== 1) return [];
    // Antigone's first separator precedes its newsletter promo and further reading.
    for (const node of children(bodies[0])) { if (publisher === "Antigone" && node.nodeName === "hr") break; walk(node); }
  } else if (publisher === "BFI") {
    // The first divider precedes screening and availability notices.
    for (const node of children(roots[0])) { if (node.nodeName === "hr") break; walk(node); }
  } else if (publisher === "Ars Technica") {
    // Inspected Ars articles split their body over several post-content blocks.
    // Only those blocks qualify; author bios/sidebar prose elsewhere do not.
    // Keep a boundary across the intervening layout/advertising modules.
    const blocks = (node: Node) => {
      if (isIgnored(node)) return;
      if (node.nodeName === "div" && hasClass(node, "post-content")) {
        boundary(); children(node).forEach(walk); boundary(); return;
      }
      children(node).forEach(blocks);
    };
    children(roots[0]).forEach(blocks);
  } else children(roots[0]).forEach(walk);
  const bounded: string[] = [];
  let remaining = 6000;
  for (const section of sections) {
    const paragraphs: string[] = [];
    for (const paragraph of section) {
      const size = paragraph.length + (paragraphs.length || bounded.length ? 2 : 0);
      if (size > remaining) break;
      paragraphs.push(paragraph); remaining -= size;
    }
    if (paragraphs.length) bounded.push(paragraphs.join("\n\n"));
    // Never leap over an omitted long paragraph to a later section.
    if (paragraphs.length !== section.length) break;
  }
  return bounded;
}
