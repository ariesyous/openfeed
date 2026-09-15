This is the very first run: the synthetic world does not exist yet. Invent its initial
population.

Create between {{MIN_ACCOUNTS}} and {{MAX_ACCOUNTS}} distinct fictional accounts. Real
variance matters more than quantity:

- Give each a genuinely different personality and writing voice (some terse, some
  rambling, some sarcastic, some earnest, some annoying, some barely post at all).
- Give each 1-3 communities they actually participate in, drawn loosely from ideas like:
  {{COMMUNITY_EXAMPLES}} -- you don't need to use these exact names, invent your own
  loose topic clusters too, and don't distribute accounts evenly across them.
- Give a handful of accounts relationships with each other (friend, rival, mutual, fan,
  blocked) -- not everyone needs relationships, but a few connections make the world feel
  populated rather than 40 strangers.
- Optionally propose 1-3 initial storylines already in motion (a running argument, an
  in-progress project, a running joke) that involve 2+ of the accounts you just created.

Also propose the initial list of communities/topic clusters for this world (you can reuse
names from the accounts' communities, or add a couple more) -- **at most 10 communities
total, no more**.

This response needs to fit within a limited output length, so keep every field concise:
`bio` a single short sentence, 2-4 items in `personalityTraits`/`interests`/`quirks`, and
at most 1-2 `relationships` per account. Prioritize covering all {{MIN_ACCOUNTS}}-
{{MAX_ACCOUNTS}} accounts with short, punchy fields over fewer accounts with long ones.

Respond with exactly this JSON shape (types shown inline, all fields required unless
marked optional):

```json
{
  "accounts": [
    {
      "handle": "lowercase_alphanumeric_underscore_2_to_30_chars",
      "displayName": "string, 1-40 chars",
      "bio": "string, up to 200 chars",
      "personalityTraits": ["string", "..."],
      "interests": ["string", "..."],
      "writingStyle": {
        "formality": 0.0,
        "avgPostLength": "short | medium | long | variable",
        "quirks": ["string", "..."],
        "emojiUsage": "none | rare | occasional | frequent"
      },
      "communities": ["string", "..."],
      "behavioralTendencies": {
        "positivity": 0.0,
        "controversialTake": 0.0,
        "replyRate": 0.0
      },
      "relationships": [{ "handle": "another_accounts_handle", "type": "friend | rival | mutual | fan | blocked" }],
      "activityLevel": "low | medium | high"
    }
  ],
  "communities": ["string", "..."],
  "initialStorylines": [
    { "title": "string", "summary": "string", "involvedHandles": ["handle1", "handle2"] }
  ]
}
```

`formality`, `positivity`, `controversialTake`, and `replyRate` are numbers between 0 and
1. Every `handle` referenced anywhere (in `relationships` or `involvedHandles`) must
match a handle you defined in `accounts`. Do not invent ids, timestamps, or engagement
numbers -- none of those fields appear above on purpose.
