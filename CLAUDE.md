# Novel Validator

A scene-based novel writing app with a continuity checker, built on the AWS free tier. It is a personal portfolio project for Zhi: it should show off coding ability and be something Zhi actually uses.

Full design sketch (data model, rules, architecture, costs): https://claude.ai/code/artifact/c12c1a67-89fa-4e81-83de-64be5580be3e

## Concept

- A project is one novel. Novels have chapters, chapters have ordered scenes.
- Each scene records where it happens in the fictional world, which characters are present, and the in-story time at several points.
- Writers keep their own profiles (a codex) for characters, items, equipment and locations.
- What makes it unique: a rules engine that checks continuity across scenes, like a linter for fiction. Existing tools (bibisco, Novelcrafter, Campfire) store this data but don't reason over it.
  - A character in two places at once.
  - Impossible travel ("Eldham at 14:00, Vosk at 16:00, but the route is 3 days").
  - A dead character reappearing.
  - A lost item being used later.

## Core model

- **Reading order vs world time.** Chapters and scenes are in reading order. What happened in the world is a set of moments on a world timeline. Every check runs on world time, so flashbacks and parallel storylines work naturally.
- **World time** is one integer: minutes since the world's epoch. A per-project calendar definition (month names, days per month, year length) converts to and from readable dates. All comparisons and travel maths are integer arithmetic.
- **Moment:** a point inside a scene with a world time, a location and who is present. A scene holds an ordered list of moments, so characters can enter or leave partway through. A moment can be anchored to a position in the prose.
- **Location:** nestable (region > town > room).
- **Item:** an object; equipment is a subtype that can be worn or wielded (has a slot).
- **Route:** a travel link between two locations, with minutes per travel mode (foot, horse, ship).
- **Event:** a state change at a moment (DEATH, DEPARTED, TRANSFER, LOST, DESTROYED).
- **Appearance:** one record per entity present at a moment. Queried per entity in world-time order, this is the checker's main input and drives the timeline view.
- **Issue:** a continuity problem found by the checker, with severity (error or warning), message, scene ids and a `dismissed` flag that survives re-checks. Rules can be turned off per project.
- Scenes can be flagged `flashback` or `dream`; the dead-or-gone rule skips those.

## Continuity rules

| Rule | Checks | Milestone |
|---|---|---|
| Double presence | Two appearances at the same world time in different locations | MVP |
| Impossible travel | Gap between consecutive appearances is shorter than the shortest route (Dijkstra over Routes, fastest mode the character has) | MVP |
| Dead or gone | Appearance after DEATH or DEPARTED, unless the scene is flashback or dream | MVP |
| Scene time order | Moments inside one scene go backwards in time | MVP |
| Item custody | Replays TRANSFER, LOST, DESTROYED; flags use by someone who doesn't hold the item | Later |
| Age | Character age at each moment against codex constraints ("veteran", "child") | Later |
| Reading order | Later in the book but earlier in world time with no flashback flag | Later |

Rules are pure functions: an entity's appearances and events in world-time order in, issues out. No AWS code inside the engine.

## Decisions so far

- **Engine first.** Build the continuity engine as plain TypeScript with Vitest (fast-check for property tests), no AWS, against a hand-written sample story with planted mistakes.
  - Sample: about 3 characters, 4 locations with routes, around 10 scenes with moments, stored as JSON.
  - Order: world-time helpers, then double presence, then impossible travel, then a CLI that runs the rules on the sample and catches every planted mistake.
- **TypeScript end to end** (assumed in the design; not yet confirmed by Zhi).
- **AWS after the engine works:** CDK for all infrastructure, Cognito sign-in, API Gateway (HTTP API, REST) and Lambda, DynamoDB with Streams, S3 for scene text.
  - Single-table DynamoDB: everything for one novel under `PROJECT#<id>`, sort key prefix gives the record type (`META`, `CHAPTER#`, `SCENE#`, `MOMENT#<sceneId>#<seq>`, `CHAR#`, `LOC#`, `ITEM#`, `ROUTE#<from>#<to>`, `EVENT#<sceneId>#<seq>`, `APPEAR#<entityId>#<zero-padded worldTime>#<sceneId>`, `ISSUE#<rule>#<hash>`). A GSI on `USER#<cognitoSub>` lists a user's projects.
  - Scene text lives in S3 as one Markdown file per scene, uploaded through presigned URLs. Entity mentions are inline tags like `@[Mara](char-mara)`.
  - Saves write Moment, Event and Appearance records; DynamoDB Streams triggers a checker Lambda that reruns rules only for the touched entities and replaces their issues.
  - CI in GitHub Actions: lint, typecheck, tests, then `cdk deploy` via GitHub OIDC (no stored AWS keys).
- **Editor: TipTap** for the scene editor, with @-mentions for codex entities. Its core and standard extensions are MIT licensed and free; do not use any paid Pro extensions or TipTap cloud. Lexical is the fallback if Zhi wants to avoid a product with paid upsells.
- **Stay in the AWS free tier.** Flag anything that could cost money before adding it.
  - DynamoDB on provisioned capacity (for example 5 and 5), not on-demand.
  - CloudWatch log retention 7 to 14 days. S3 versioning needs a lifecycle rule expiring old versions.
  - Cognito on Lite or Essentials, not Plus.
  - Avoid NAT Gateways, RDS, ElastiCache, OpenSearch, Kinesis, Glue crawlers and anything always-on.

## Planned layout

One TypeScript monorepo:

- `engine/` pure continuity rules, route graph and world-time calendar, with Vitest and fast-check
- `api/` Lambda handlers
- `web/` React + Vite front end with the TipTap editor
- `infra/` AWS CDK stacks
- `.github/workflows/` CI and deploy

## Open questions

- REST through API Gateway (assumed) or GraphQL through AppSync?
- Single user to start, or sharing with co-writers and beta readers?
- Manual @-mentions only (assumed), or auto-detect names by alias matching?
- Is offline writing needed? (It would mean a local-first store that syncs.)
