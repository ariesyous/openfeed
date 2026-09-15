import type { Comment } from "../../schemas";

export interface CommentNode {
  comment: Comment;
  /** Visual nesting depth, capped at maxDepth even if the underlying thread runs deeper. */
  depth: number;
  children: CommentNode[];
}

/** Builds a reply tree from flat parentCommentId references, ordered oldest-first within each level. */
export function buildCommentTree(comments: Comment[], maxDepth = 2): CommentNode[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment] as const));
  const childrenByParent = new Map<string, Comment[]>();
  const roots: Comment[] = [];

  for (const comment of comments) {
    const parentId =
      comment.parentCommentId && byId.has(comment.parentCommentId)
        ? comment.parentCommentId
        : null;
    if (parentId) {
      const siblings = childrenByParent.get(parentId);
      if (siblings) siblings.push(comment);
      else childrenByParent.set(parentId, [comment]);
    } else {
      roots.push(comment);
    }
  }

  const byCreatedAtAsc = (a: Comment, b: Comment) => a.createdAt.localeCompare(b.createdAt);
  roots.sort(byCreatedAtAsc);
  for (const siblings of childrenByParent.values()) siblings.sort(byCreatedAtAsc);

  const build = (comment: Comment, depth: number): CommentNode => ({
    comment,
    depth: Math.min(depth, maxDepth),
    children: (childrenByParent.get(comment.id) ?? []).map((child) => build(child, depth + 1)),
  });

  return roots.map((root) => build(root, 0));
}

/** Flattens a comment tree into render order (depth-first), useful for simple list rendering. */
export function flattenCommentTree(nodes: CommentNode[]): CommentNode[] {
  const out: CommentNode[] = [];
  const visit = (node: CommentNode) => {
    out.push(node);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return out;
}
