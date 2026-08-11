# Deployment

The reference deployment targets OpenAI Sites with a D1 binding through the bundled vinext build. A fork must create its own private Sites project and database. The repository intentionally contains only `.openai/hosting.example.json`; never reuse the maintainer's `project_id`.

## Before an agent changes anything

Answer these first:

- Who can open the journal, and how will access be revoked?
- Which model provider may receive food photos?
- Which time zone, goals, and frequent foods belong to this deployment?
- How will the D1 database be backed up, restored, exported, and deleted?
- Is Apple Health actually needed?

The agent should create a new Sites project, copy the logical D1 binding name `DB`, and then persist that new project ID in a local `.openai/hosting.json`. Runtime values belong in Sites, not that file.

## Runtime configuration

Required before network exposure:

- `APP_ACCESS_TOKEN`: at least 24 random characters; protects the journal and data APIs

Required only for photo analysis and model-assisted food-name normalisation:

- `AI_API_KEY`
- `AI_BASE_URL`: the DashScope OpenAI-compatible API root, such as `https://dashscope.aliyuncs.com/compatible-mode/v1`; Tarelog appends `/chat/completions` once
- `AI_MODEL`: a DashScope model that accepts image input and structured output; the sample uses `qwen3.7-plus`

The bundled request format is validated for DashScope. “OpenAI-compatible” does not guarantee that another provider accepts the same multimodal schema or `enable_thinking` parameter; adapt and test the provider boundary before using one.

Optional:

- `USDA_API_KEY`: use a personal FoodData Central key in production; `DEMO_KEY` is rate limited
- `APP_TIME_ZONE`: IANA identifier, default `UTC`; set this explicitly for correct meal dates
- all four of `TARGET_KCAL`, `TARGET_PROTEIN`, `TARGET_CARBS`, `TARGET_FAT`; an incomplete set is ignored
- `QUICK_LOG_ITEMS_JSON`: up to 12 deployer-reviewed items; defaults to `[]`
- `HEALTH_SYNC_TOKEN`: separate random token, only when Apple Health is enabled

Generate independent access and health tokens:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Never reuse an account password or model key.

## Database

For a new database, apply the ordered SQL files in `drizzle/`. Migration `0002`, `0003`, and `0005` are intentionally harmless compatibility no-ops because older private versions used those filenames for maintainer-only data repairs. Public release migrations must not update or delete journal rows.

For an existing database:

1. Export a backup.
2. Restore it into a separate test database.
3. Apply only unapplied migrations there first.
4. Check row counts and several real entries before updating production.

The application can create missing current tables defensively, but that is not a substitute for controlled migrations and a tested restore.

## Validate before publishing

```bash
npm ci
npm test
npm run build
npm run lint
npm audit --omit=dev
```

Then verify:

- `/` contains no private journal data.
- `/journal` and protected APIs reject unauthorised requests.
- A real example works through input → review → correction → confirm → reopen → edit.
- Dismissing an unconfirmed photo or note creates no D1 row.
- “米饭” does not resolve to raw rice and an unrelated USDA result is rejected.
- A package-label zero remains zero; a missing field is labelled as an estimate or missing.
- No environment file, token, database, photo, Shortcut, private URL, or personal target is tracked.

Sites publishing, Git pushes, and migrations change external state. The agent must show the validated result and ask before each publish or push. Prefer a private deployment. Do not connect a public demo to a personal database.

## Apple Health

Follow [APPLE_HEALTH.md](APPLE_HEALTH.md). A Mac build proves only that the Shortcut can be generated. Before claiming Apple Health support for a deployment, test import, permissions, units, values, and two consecutive runs on the owner's iPhone.
