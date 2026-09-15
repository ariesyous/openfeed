import type { Engagement } from "../../schemas";
import { formatCount } from "../lib/formatCount";

export function EngagementBar({ engagement }: { engagement: Engagement }) {
  return (
    <div className="engagement-bar">
      <span className="engagement-item" title="likes">
        ♥ {formatCount(engagement.likes)}
      </span>
      <span className="engagement-item" title="replies">
        💬 {formatCount(engagement.replies)}
      </span>
      <span className="engagement-item" title="reposts">
        ↻ {formatCount(engagement.reposts)}
      </span>
      <span className="engagement-item" title="views">
        👁 {formatCount(engagement.views)}
      </span>
    </div>
  );
}
