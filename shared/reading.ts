/** Blank lines separate paragraphs; the text itself is never rewritten. */
export function splitParagraphs(text: string): string[] {
  const paragraphs = text.split(/\n[ \t]*\n+/).map(part => part.trim()).filter(Boolean);
  return paragraphs.length ? paragraphs : [text];
}
