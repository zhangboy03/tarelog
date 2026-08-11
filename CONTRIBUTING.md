# Contributing to Tarelog

Thank you for helping make food logging more trustworthy, portable, and calm.

## Before opening work

1. Search existing issues before opening a duplicate.
2. Use the bug or feature issue form so the expected outcome is testable.
3. Open an issue before a large UI, data-model, provider, or deployment change.
4. Never attach real food photos, access tokens, API keys, production database exports, Apple Health data, or private deployment URLs.

## Local setup

```bash
npm install
cp .dev.vars.example .dev.vars
openssl rand -hex 32
npm run dev
```

Set the generated value as `APP_ACCESS_TOKEN`. Photo analysis is optional for most UI work; leave `AI_API_KEY` unset when it is not needed.

## Pull requests

- Keep one PR focused on one user-visible or maintenance outcome.
- Match the existing TypeScript and CSS style; avoid unrelated refactors.
- Add or update tests for changed behaviour.
- Update the relevant privacy, deployment, architecture, or user documentation when a trust boundary changes.
- Use synthetic fixtures. Do not add production data to tests or screenshots.
- Prefer Conventional Commit subjects such as `fix(access): protect journal APIs`.

Before requesting review:

```bash
npm test
npm run build
npm run lint
```

Describe what changed, why it changed, how it was verified, and any migration or privacy impact.

## Contribution license

Tarelog uses an inbound-equals-outbound policy: submitted contributions are licensed under the project's MIT License. No CLA is required. By contributing, you confirm that you have the right to submit the work under that license.

All contributors must follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
