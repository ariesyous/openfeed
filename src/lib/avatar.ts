export interface AvatarProps {
  initials: string;
  colorA: string;
  colorB: string;
  angle: number;
}

/** djb2 string hash, kept small and dependency-free since it only needs to be stable, not cryptographic. */
export function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function deriveInitials(displayName: string, handle: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return handle.slice(0, 2).toUpperCase();
}

/**
 * Deterministic, dependency-free avatar look: a two-hue HSL gradient plus initials,
 * derived from a hash of the account's stable identifier so it never changes across renders
 * or generation cycles, without depending on an external avatar service.
 */
export function getAvatarProps(
  seedKey: string,
  displayName: string,
  handle: string,
): AvatarProps {
  const hash = hashString(seedKey);
  const hueA = hash % 360;
  const hueB = (hueA + 40 + ((hash >> 8) % 80)) % 360;
  const angle = (hash >> 16) % 360;

  return {
    initials: deriveInitials(displayName, handle),
    colorA: `hsl(${hueA}, 65%, 55%)`,
    colorB: `hsl(${hueB}, 65%, 45%)`,
    angle,
  };
}
