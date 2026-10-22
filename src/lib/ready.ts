/** Prerendered HTML stays visible until React has real content to replace it. */
let reveal: (() => void) | null = null;

export function deferReveal(show: () => void) {
  reveal = show;
}

export function markReady() {
  const show = reveal;
  reveal = null;
  show?.();
}
