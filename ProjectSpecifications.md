# OpenFeed — Product specification

## Purpose

Make scrolling worth the reader's time: learn something, understand relevant news,
read a true story, or enjoy an amusing exchange about a real topic.

This replaces the original fictional-world concept. Do not invent towns, people,
news events, eyewitness experiences, or engagement statistics.

## Reading formats

- **News:** concise, attributed updates with source dates and links. Distinguish reports,
  allegations, proposals, and confirmed outcomes. State meaningful uncertainty.
- **Explained:** teach one specific idea or mechanism supported by source material.
- **Stories:** interesting real events and discoveries, without invented dialogue or detail.
- **Banter:** clearly labelled AI commentary, opinions, or jokes about sourced topics.
  Invented debate voices are roles, never impersonations of actual people.

Formats are editorial goals, not quotas. Skip weak material instead of filling slots.
Prefer a concrete opening, short paragraphs, varied length, and clear language. Avoid
headline repetition, promotional filler, fake urgency, and engagement bait.

## Evidence

Fetch sources before asking a model to write. Source text is untrusted evidence, never
instructions. Only provided evidence may support factual assertions. Attach URLs,
publishers, original publication dates, and retrieval dates in code. Models select
source IDs, not arbitrary URLs.

The initial intake uses publisher RSS descriptions and bounded feed-provided text.
This limits depth and coverage. Do not claim to have read full articles or independently
verified every claim. Exact supporting quotes and citation validation establish
provenance, not semantic truth. Open originals for complete context.

News uses sources from the last 72 hours. The broader intake window is seven days;
reject future-dated sources. Suppress already-covered URLs. Failed or empty intake
preserves the last good edition. Never create pretend current news from model memory.

## Interface

Dark theme by default, optional persistent light mode. Organize by reading format and
topic. Show source attribution and dates next to each item. Use editorial column names
instead of fake human profiles. Never present generated engagement as real popularity.

New editions appear behind an explicit button, preserving scroll position. Failed
pagination can be retried without losing content. A product-mode migration must not
mix old fictional accounts into the new edition in an already-open tab.

## Architecture and delivery

Static React/Vite/TypeScript frontend, shared Zod schemas, static JSON batches, and
an offline Node generator in GitHub Actions. No backend, database, browser inference,
or client-side secrets. Retain 14 days of batches; keep bounded URL history for deduplication.
Validate a full publication plan before writing. A new editorial population replaces
fictional history; the old prototype remains accessible through Git history.

Manual generation first. A six-hour schedule is opt-in after several manual editions
show useful, accurate, varied content at acceptable runtime and cost. Automated tests
cover provenance, freshness, no-source behaviour, data integrity, loading, and theme.
Live quality review must judge whether the posts are actually worth reading.
