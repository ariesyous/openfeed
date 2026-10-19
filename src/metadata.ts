import { metadataTags, type PageMetadata } from "../shared/seo";

/** Keep navigation from leaving the previous article's canonical, image or schema behind. */
export function updateMetadata(page: PageMetadata) {
  document.title = page.title;
  document.head.querySelectorAll('meta[data-seo], meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[property^="article:"], meta[name^="twitter:"], link[rel="canonical"], #page-structured-data').forEach(node => node.remove());
  if (page.url) {
    const link = document.createElement("link");
    link.rel = "canonical"; link.href = page.url; document.head.append(link);
  }
  for (const tag of metadataTags(page)) {
    const meta = document.createElement("meta");
    meta.setAttribute(tag.name ? "name" : "property", tag.name ?? tag.property!);
    meta.content = tag.content; meta.dataset.seo = ""; document.head.append(meta);
  }
  if (page.structuredData) {
    const script = document.createElement("script");
    script.id = "page-structured-data"; script.type = "application/ld+json";
    script.textContent = JSON.stringify(page.structuredData); document.head.append(script);
  }
}
