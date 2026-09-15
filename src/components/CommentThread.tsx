import type { Account, Comment } from "../../schemas";
import { buildCommentTree, type CommentNode } from "../lib/commentTree";
import { formatCount } from "../lib/formatCount";
import { formatRelativeTime } from "../lib/relativeTime";
import { Avatar } from "./Avatar";

interface CommentThreadProps {
  comments: Comment[];
  accountsById: Map<string, Account>;
}

export function CommentThread({ comments, accountsById }: CommentThreadProps) {
  if (comments.length === 0) {
    return <p className="comment-thread-empty">No comments yet.</p>;
  }

  const tree = buildCommentTree(comments);
  return (
    <div className="comment-thread">
      {tree.map((node) => (
        <CommentNodeView key={node.comment.id} node={node} accountsById={accountsById} />
      ))}
    </div>
  );
}

function CommentNodeView({
  node,
  accountsById,
}: {
  node: CommentNode;
  accountsById: Map<string, Account>;
}) {
  const author = accountsById.get(node.comment.authorId);
  const displayName = author?.displayName ?? "Unknown";
  const handle = author?.handle ?? "unknown";

  return (
    <div className="comment" style={{ marginLeft: node.depth * 20 }}>
      <div className="comment-header">
        <Avatar seedKey={node.comment.authorId} displayName={displayName} handle={handle} size={24} />
        <span className="comment-author">{displayName}</span>
        <span className="comment-handle">@{handle}</span>
        <span className="comment-time">{formatRelativeTime(node.comment.createdAt)}</span>
      </div>
      <p className="comment-body">{node.comment.body}</p>
      <div className="comment-footer">♥ {formatCount(node.comment.engagement.likes)}</div>
      {node.children.map((child) => (
        <CommentNodeView key={child.comment.id} node={child} accountsById={accountsById} />
      ))}
    </div>
  );
}
