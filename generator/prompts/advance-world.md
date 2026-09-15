Advance this synthetic world by exactly one generation cycle. Here is the current state:

### World state

{{WORLD_STATE_JSON}}

### Known accounts

{{ACCOUNTS_SUMMARY}}

### Your task

Produce {{ITEMS_PER_CYCLE}} top-level feed items (this is a target, not a hard quota --
close is fine) and roughly {{COMMENTS_MIN}}-{{COMMENTS_MAX}} comments distributed
unevenly across them. Not every item needs comments; a few items should get most of the
discussion while many get none or almost none.

Where it's natural, have items reference the world state above: continue an active
storyline, land a callback to a running joke, escalate or cool off a conflict, react to a
current trend. Not everything needs to connect -- plenty of posts should just be
standalone, mundane, or off-topic, the way a real feed is -- but several should
demonstrate that this world remembers what happened before.

Each item's `kind` must be one of: text_post, question, discussion, hot_take,
observation, personal_anecdote, joke, community_post, announcement, link_preview,
reaction, repost.

- `repost` and `reaction` items MUST set `referencedTempId` to the `tempId` of another
  item you are including EARLIER in this same `items` array (never a historical item you
  don't have in front of you -- you don't have access to older batches, only the
  summaries above).
- `link_preview` items MUST include a `linkPreview` object with a plausible fictional
  `url`, `domain`, `linkTitle`, and optional `linkDescription`.
- Every `authorHandle` (for items and comments) and `parentTempId` (for nested comments)
  must reference a handle/tempId that actually exists in this response or in the known
  accounts list above.

Finally, propose a `worldStateUpdate`: what changed this cycle (new or updated
storylines, new running jokes, new or escalating conflicts, current trends, a short
memory to attach to specific characters if something notable happened to them, and a
1-3 sentence `cycleSummary` of what happened this cycle overall).

Respond with exactly this JSON shape:

```json
{
  "items": [
    {
      "tempId": "short local id, e.g. p1",
      "kind": "text_post",
      "authorHandle": "existing_account_handle",
      "community": "string",
      "title": "string, optional",
      "body": "string",
      "referencedTempId": "another item's tempId, only for repost/reaction",
      "linkPreview": { "url": "https://...", "domain": "string", "linkTitle": "string", "linkDescription": "string, optional" },
      "comments": [
        { "tempId": "c1", "authorHandle": "existing_account_handle", "body": "string", "parentTempId": "another comment's tempId in this same item, optional" }
      ],
      "relativeAgeHint": "fresh | recent | older, optional"
    }
  ],
  "worldStateUpdate": {
    "newStorylines": [{ "title": "string", "summary": "string", "involvedHandles": ["handle"], "status": "active | escalating | cooling | resolved" }],
    "updatedStorylineIds": [{ "id": "existing storyline id from World state above", "summary": "string", "status": "active | escalating | cooling | resolved" }],
    "newRunningJokes": [{ "description": "string", "originHandles": ["handle"] }],
    "newConflicts": [{ "description": "string", "handles": ["handle"], "heat": "simmering | active | cooling" }],
    "currentTrends": [{ "topic": "string", "community": "string", "strength": 0.0 }],
    "newMemoriesByHandle": { "existing_account_handle": ["short memory string"] },
    "cycleSummary": "1-3 sentences"
  }
}
```

Do not invent ids, timestamps, or engagement numbers (likes, views, reposts) -- none of
those fields appear above on purpose; the application assigns them.
