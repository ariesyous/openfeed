/** Fit unchanged copy before paint, keeping the largest size the card can hold. */
export function fitCardText(content: HTMLElement, available: HTMLElement): boolean {
  const apply = (scale: number) => content.style.setProperty("--card-text-scale", String(scale));
  const fits = () => content.scrollHeight <= available.clientHeight && content.scrollWidth <= available.clientWidth;
  apply(1);
  if (available.clientHeight <= 0 || available.clientWidth <= 0) return false;
  if (fits()) return true;

  // 13px at the default root size; respect a reader's larger root font setting.
  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const body = content.querySelector("p") ?? content;
  const bodySize = parseFloat(getComputedStyle(body).fontSize) || rootSize;
  let low = Math.min(1, rootSize * .8125 / bodySize), high = 1;
  apply(low);
  if (!fits()) return false;
  for (let step = 0; step < 8; step++) {
    const middle = (low + high) / 2;
    apply(middle);
    if (fits()) low = middle;
    else high = middle;
  }
  apply(low);
  return true;
}
