import { publicationDate } from "../../shared/publicationDate";

/** Explicit provenance for each date, shared by feed, article and Cards. */
export function PublicationDate({ iso, added = false }: { iso?: string; added?: boolean }) {
  const date = publicationDate(iso);
  const meaning = added ? "When Openfeed created this article, not when its sources were published." : "Source publication date (UTC), not when Openfeed added this article.";
  if (date.status === "dated") return <time dateTime={date.dateTime} title={meaning}>
    {added ? "Added" : "Published"} {date.label}
  </time>;
  const reason = {
    missing: "No publication timestamp was supplied.",
    invalid: "The stored publication timestamp is invalid.",
    future: "The stored publication timestamp is in the future; it is not treated as dated reporting.",
  }[date.status];
  return <span title={reason}>{added ? "Added date unavailable" : "Publication date unavailable"}</span>;
}
