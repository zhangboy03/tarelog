# Tarelog Project Guide

## Mission

Help a person record what they eat, understand long-term patterns, and build healthier habits without turning food into judgment.

Keep the product human-first. Understand the person before changing the app. Prefer the smallest reliable logging loop over a broad feature set.

## 1. Start with the person

Do not write code until the answers below are clear. Ask only questions that can change the design.

### Purpose

- What should this history help you understand or decide?
- What would make daily logging worth continuing?
- What should the app never claim or decide for you?

### Real food and capture

- What do you actually eat: weighed ingredients, packaged food, restaurant meals, recipes, supplements, or something else?
- Which languages, units, kitchen scale, phone, and browser do you use?
- Which frequent foods should resolve locally without an external lookup?
- Which input is least annoying: one photo control, text, shortcuts, or another flow?

### Data

- Which fields matter: calories, macros, fibre, sodium, caffeine, ingredients, photos, or notes?
- What history and trends are useful? What is noise?
- Which examples will prove that capture, correction, saving, and later editing work?

### Ownership and privacy

- Where should records and images live?
- What may be sent to an external model, and what must never leave the owner's infrastructure?
- Which model provider is acceptable? Is a local model required?
- Who may access the journal, and how should access be revoked?
- How will the owner export, back up, restore, and delete the data?

### Environment

- Where will the app run: local machine, home server, Cloudflare, or another host?
- Which integrations are truly needed, such as Apple Health?
- What ongoing cost, maintenance, and failure modes are acceptable?

After the interview, restate the owner's needs, boundaries, acceptance examples, and the smallest build plan. Get agreement before expanding scope.

## 2. Adapt in this order

1. Protect the private instance, secrets, and data paths.
2. Make the owner's most common capture flow fast.
3. Add canonical local foods before structured public-data fallback.
4. Require review and correction before anything enters history.
5. Make saved entries editable and auditable.
6. Add only the history, export, backup, deletion, and integrations the owner asked for.

Reuse the reference implementation where it fits. Replace its infrastructure, provider, schema, or interface when the owner's answers require it. Explain every trust-boundary change.

## 3. Preserve these boundaries

- Automated image analysis may extract visible facts. It must not present hidden nutrition estimates as observations.
- Human confirmation comes before storage and downstream sync.
- Secrets, private URLs, food photos, health data, and database exports never enter Git.
- The public project page and any demo stay isolated from the private journal.
- Authentication is required for every journal data path on a networked deployment.
- The owner chooses the model, storage, retention, and integrations.
- Nutrition values remain editable and traceable to a source.
- Do not add diagnosis, treatment advice, food morality, social ranking, advertising, or default analytics.
- Do not create a plugin system or multi-user platform without a concrete owner need.

## 4. Know the reference

- `app/journal/` and `app/KitchenApp.tsx`: private journal interface
- `app/api/`: access, capture, nutrition, journal, and health-sync routes
- `lib/access.ts`: journal access boundary
- `lib/nutrition.ts`: canonical local foods and fallback order
- `lib/nutrition-cache.ts`: persistent structured USDA cache
- `db/` and `drizzle/`: data model and migrations
- `docs/PRIVACY.md`: current data flow and known lifecycle limits
- `docs/ARCHITECTURE.md`: reference trust boundaries
- `docs/DEPLOYMENT.md`: Cloudflare reference deployment

Do not assume a capability exists because it appears on the roadmap. Verify it in code and tests.

## 5. Verify the owner's loop

Before calling the work complete:

- Run `npm test`, `npm run build`, and `npm run lint`.
- Confirm unauthorised journal and API requests are rejected.
- Test the owner's real capture example end to end: input → extraction → correction → save → reopen → edit.
- Test a manual note and at least one packaged-food label when those inputs are in scope.
- Confirm unreviewed model output cannot enter history.
- Confirm canonical local food data precedes external fallback where configured.
- Confirm records survive deployment and migration as intended.
- Confirm export, backup, restore, and deletion when those flows changed or are promised.
- Confirm Apple Health writes are incremental and repeat-safe on an iPhone when enabled.
- Inspect the Git diff for secrets, private data, unrelated changes, and claims that exceed the evidence.

Report what was tested, what was only inspected, and what still needs the owner's device or account.
