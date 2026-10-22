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
};
export const hasArticleAdapter = (publisher: string) => Boolean(bodyMarkers[publisher.startsWith("BBC") ? "BBC" : publisher]);

/** Explicit publisher bodies, not a general readability scraper. No scripts execute. */
export function sourceArticleSections(html: string, publisher: string): string[] {
  if (Buffer.byteLength(html, "utf8") > 1_000_000) return [];
  const cleaned = html.replace(/<!doctype\s+html\s*>/gi, "");
  if (/<!DOCTYPE|<!ENTITY/i.test(cleaned)) return [];
  const marker = bodyMarkers[publisher.startsWith("BBC") ? "BBC" : publisher];
  if (!marker) return [];
  const isIgnored = (node: Node) => ignored(node) ||
    (publisher === "JSTOR Daily" && hasClass(node, "daily_email_signup")) ||
    (publisher === "Aeon" && hasClass(node, "pullquote"));
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
      // Inline WATCH/READ MORE links are separate modules, not supporting prose.
      if (/^(?:WATCH|READ MORE|LISTEN):/i.test(paragraph) || /(?:…|\.\.\.)[”"')\]]?$/.test(paragraph)) boundary();
      else if (paragraph) sections.at(-1)!.push(paragraph);
    } else children(node).forEach(walk);
    if (tag === "section") boundary();
  };
  if (publisher === "Aeon") {
    // The inspected essay text is inside one has-dropcap block. Audio-player
    // labels alongside it in #article-content are not article prose.
    const bodies: Node[] = [];
    const findBody = (node: Node) => {
      if (isIgnored(node)) return;
      if (node.nodeName === "div" && hasClass(node, "has-dropcap")) { bodies.push(node); return; }
      children(node).forEach(findBody);
    };
    children(roots[0]).forEach(findBody);
    if (bodies.length !== 1) return [];
    children(bodies[0]).forEach(walk);
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
