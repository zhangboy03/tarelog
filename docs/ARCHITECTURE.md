# Architecture

## Product boundary

Tarelog has two surfaces:

1. `/` is a public, static project page using synthetic content.
2. `/journal` and the journal APIs operate on private deployment data and require an access session.

The application is single-user. There is no tenant identifier or row-level ownership model.

## Request flow

```text
public visitor ──> / ──> static project content

journal visitor ──> /api/access ──> HTTP-only access cookie
                       │
                       └──> protected journal APIs
                                  │
                 ┌────────────────┼────────────────┐
                 v                v                v
      unconfirmed browser      D1 after       model provider
             state             confirmation    + USDA FDC
```

Photo and manual analysis routes return temporary results. Only `/api/kitchen` `saveAnalysis` and `logMeal` persist confirmed data. Tarelog does not store photo bytes.

Apple Health uses a separate header token because the iPhone Shortcut is not a browser session. The server tracks acknowledgements per meal and nutrient.

## Data stores

- `analyses`: confirmed extraction and correction metadata; `image_key` is retained only for schema compatibility and remains empty.
- `nutrition_references`: cached structured USDA nutrition matches with source URLs.
- `meal_logs`: confirmed daily ledger entries.
- `health_syncs`: per-entry, per-nutrient Apple Health acknowledgements.

## Trust boundaries

- Browser input and model output are untrusted and validated in route handlers.
- The access cookie proves knowledge of one deployment token; it does not identify a person.
- A package label is an observation. A generic-food database value is an estimate. Stored source metadata keeps the distinction.
- Missing label nutrients are represented separately from a real zero before any generic reference is considered.
- Cloudflare, the chosen model provider, and USDA are external services selected or accepted by the deployer.

## Known limits

- No multi-user isolation or per-device revocation.
- No complete bulk export, backup/restore UI, or account-wide deletion flow.
- Apple Health Shortcut sync is best-effort, not transactional: a Health write can succeed while its acknowledgement request fails, so a retry may duplicate that one sample.
