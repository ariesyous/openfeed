import type { MouseEvent } from "react";
import { topicLabel, topicPath } from "../../shared/topics";
import { articlePath } from "../../shared/articles";
import { splitParagraphs } from "../../shared/reading";
import type { FeedItem } from "../../schemas";
import { PublicationDate } from "./PublicationDate";

const FORMAT_LABELS = { news: "News", explainer: "Explained", story: "True story", banter: "Banter · Opinion" } as const;
const plainClick = (event: MouseEvent) => !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0;

/** Headline view of an editorial post. The full article is one click away; spoilers show the title only. */
export function PostCardCompact({ item, onOpenArticle, onCommunityClick }: {
  item: FeedItem;
  onOpenArticle?: (item: FeedItem) => void;
  onCommunityClick?: (community: string) => void;
}) {
  const editorial = item.editorial!;
  const base = import.meta.env.BASE_URL;
  const publishers = [...new Set(editorial.sources.map(source => source.publisher))].join(", ");
  return (
    <article className="post-card post-card--compact" id={item.id}>
      <div className="post-card-meta">
        <span className={`format-label format-label--${editorial.format}`}>{FORMAT_LABELS[editorial.format]}</span>
        <a className="post-card-community" href={topicPath(item.community, base)} onClick={(event) => {
          if (!onCommunityClick || !plainClick(event)) return;
          event.preventDefault(); onCommunityClick(item.community);
        }}>{topicLabel(item.community)}</a>
      </div>
      <h3 className="post-card-title"><a href={articlePath(item, base)} onClick={(event) => {
        if (!onOpenArticle || !plainClick(event)) return;
        event.preventDefault(); onOpenArticle(item);
      }}>{item.title ?? "Article"}</a></h3>
      {editorial.spoilers
        ? <p className="post-card-excerpt">Contains spoilers — open the article to reveal.</p>
        : <p className="post-card-excerpt">{splitParagraphs(item.body)[0]}</p>}
      <p className="post-card-compact-meta"><PublicationDate iso={item.createdAt} added /> · {publishers}</p>
    </article>
  );
}
