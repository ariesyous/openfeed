import { publicationDate } from "../../shared/publicationDate";
import { formatRelativeTime } from "../lib/relativeTime";

/** Explicit provenance for each date, shared by feed, article and Cards. */
export function PublicationDate({ iso, added = false }: { iso?: string; added?: boolean }) {
  const now = new Date();
  const date = publicationDate(iso, now);
  const meaning = added ? "When Openfeed created this article, not when its sources were published." : "Source publication date (UTC), not when Openfeed added this article.";
  if (date.status === "dated") {
    const age = added ? formatRelativeTime(date.dateTime, now) : "";
    const label = age === "just now" ? age : /^\d+[mhdw]$/.test(age) ? `${age} ago` : date.label;
    return <time dateTime={date.dateTime} title={`${date.dateTime} (UTC). ${meaning}`}>
      {added ? "Added" : "Published"} {label}
    </time>;
  }
  const reason = {
    missing: "No publication timestamp was supplied.",
    invalid: "The stored publication timestamp is invalid.",
    future: "The stored publication timestamp is in the future; it is not treated as dated reporting.",
  }[date.status];
  return <span title={reason}>{added ? "Added date unavailable" : "Publication date unavailable"}</span>;
}
