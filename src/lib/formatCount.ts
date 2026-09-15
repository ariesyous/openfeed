/** Formats an engagement count compactly, e.g. 950 -> "950", 1200 -> "1.2K", 3_400_000 -> "3.4M". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${trimToOneDecimal(n / 1000)}K`;
  return `${trimToOneDecimal(n / 1_000_000)}M`;
}

function trimToOneDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
