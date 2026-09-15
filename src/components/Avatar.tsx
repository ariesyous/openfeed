import { getAvatarProps } from "../lib/avatar";

interface AvatarProps {
  seedKey: string;
  displayName: string;
  handle: string;
  size?: number;
}

export function Avatar({ seedKey, displayName, handle, size = 40 }: AvatarProps) {
  const { initials, colorA, colorB, angle } = getAvatarProps(seedKey, displayName, handle);
  const gradientId = `avatar-gradient-${seedKey.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      className="avatar"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={displayName}
    >
      <defs>
        <linearGradient id={gradientId} gradientTransform={`rotate(${angle})`}>
          <stop offset="0%" stopColor={colorA} />
          <stop offset="100%" stopColor={colorB} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${gradientId})`} />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="15"
        fontWeight="600"
        fill="white"
      >
        {initials}
      </text>
    </svg>
  );
}
